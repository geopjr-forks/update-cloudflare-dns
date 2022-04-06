import * as core from "@actions/core";
import process, { exit } from "process";
process.noDeprecation = true; // peer dep
import fs from "fs";
import Cloudflare from "cloudflare";
import "dotenv/config";

import {
  partitionRecords,
  printConfigRecord,
  printRemoteRecord,
} from "./helpers.js";

/**
 * Gets action input or env var.
 * @param {string} inputName Name of action input
 * @param {string} envName Name of env
 * @returns {string} The content of the input or env
 */
const inputOrEnv = (inputName, envName) => {
  const input = core.getInput(inputName);
  if (input !== "") return input;

  const env = process.env[envName];
  return env;
};

const main = async () => {
  const ZONE = inputOrEnv("zone", "ZONE");
  if (ZONE === undefined) {
    console.log("Zone not set. Make sure to provide one in the GitHub action.");
    core.setFailed("Zone not set.");
    exit(-1);
  }

  const TOKEN = inputOrEnv("cloudflareToken", "CLOUDFLARE_TOKEN");
  if (TOKEN === undefined) {
    console.log(
      "Cloudflare token not found. Make sure to add one in GitHub environments."
    );
    core.setFailed("Cloudflare token not found.");
    exit(-1);
  }

  const cf = new Cloudflare({
    token: TOKEN,
  });

  const DRY_RUN = Boolean(process.env.DRY_RUN);

  const rawText = fs.readFileSync("./DNS-RECORDS.json").toString();
  const config = JSON.parse(rawText);

  let zoneId = "";
  try {
    const response = await cf.zones.browse();
    const zones = response.result;
    const theZones = zones
      .filter((zone) => zone.name === ZONE)
      .map((zone) => zone.id);
    if (theZones.length === 0) {
      console.log(`No zones found with name: ${ZONE}.`);
      console.log("Make sure you have it right in DNS-RECORDS.hjson.");
      core.setFailed("Zone not found.");
      exit(-1);
    }
    zoneId = theZones[0];
  } catch (err) {
    console.log(err);
    core.setFailed(err);
    exit(-1);
  }

  const currentRecords = (await cf.dnsRecords.browse(zoneId)).result;

  const { toBeDeleted, toBeKept, toBeAdded } = partitionRecords(
    currentRecords,
    config.records
  );

  console.log("Records that will be deleted:");
  await Promise.all(
    toBeDeleted.map(async (rec) => {
      if (!DRY_RUN) {
        try {
          if (!rec?.id) throw "Record doesn't have an ID - Can't delete";
          await cf.dnsRecords.del(zoneId, rec.id);
          console.log("✔ ", printRemoteRecord(rec));
        } catch (err) {
          console.log("❌ ", printRemoteRecord(rec));
          console.log(err);
          core.setFailed(err);
          exit(-1);
        }
      }
    })
  );

  console.log("Records that will be kept:");
  toBeKept.forEach((rec) => {
    console.log("✔ ", printRemoteRecord(rec));
  });

  console.log("Records that will be added:");
  await Promise.all(
    toBeAdded.map(async (rec) => {
      if (!DRY_RUN) {
        try {
          const result = {
            type: rec.type,
            name: rec.name,
            content: rec.content,
            ttl: rec?.ttl ?? 1,
            proxied: rec?.proxied ?? true,
          };

          if (rec.type === "MX") {
            result["priority"] = rec.priority ?? 10;
            result["proxied"] = false; // Cannot be proxied
          }

          await cf.dnsRecords.add(zoneId, result);

          console.log("✔ ", printConfigRecord(rec, ZONE));
        } catch (err) {
          console.log("❌ ", printConfigRecord(rec, ZONE));
          console.log(err);
          core.setFailed(err);
          exit(-1);
        }
      }
    })
  );
};
main();
