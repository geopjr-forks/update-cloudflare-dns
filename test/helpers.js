import { expect } from "chai";
import {
  niceRecordName,
  sameDiffArr,
  sameRecord,
  partitionRecords,
} from "../src/helpers.js";

const remoteRecords = [
  {
    id: "b68a140aae204954a87ecb599f44d4e4",
    zone_id: "2fc7350edfd34ec1bf60322f47c2b108",
    zone_name: "geopjr.dev",
    name: "geopjr.dev",
    type: "A",
    content: "192.0.2.1",
    proxiable: true,
    proxied: true,
    ttl: 1,
    locked: false,
    meta: {
      auto_added: false,
      managed_by_apps: false,
      managed_by_argo_tunnel: false,
      source: "primary",
    },
    created_on: "2022-04-06T00:00:00.12792Z",
    modified_on: "2022-04-06T00:00:00.12792Z",
  },
  {
    id: "6908d3479ce44b4882dc912088607b59",
    zone_id: "2fc7350edfd34ec1bf60322f47c2b108",
    zone_name: "geopjr.dev",
    name: "www.geopjr.dev",
    type: "A",
    content: "192.0.2.1",
    proxiable: true,
    proxied: true,
    ttl: 1,
    locked: false,
    meta: {
      auto_added: false,
      managed_by_apps: false,
      managed_by_argo_tunnel: false,
      source: "primary",
    },
    created_on: "2022-04-05T00:00:00.878225Z",
    modified_on: "2022-04-06T00:00:00.863989Z",
  },
];

const localRecords = [
  { type: "A", name: "geopjr.dev", content: "192.0.2.1", ttl: 1 },
  { type: "A", name: "www", content: "192.0.2.1", ttl: 14400 },
  { type: "CNAME", name: "collision", content: "github.io", ttl: 1 },
];

describe("test niceRecordName", () => {
  const zone = "geopjr.dev";
  const subdomain = "collision";

  it("returns @ if name is just zone", () => {
    expect(niceRecordName(zone, zone)).to.equal("@");
  });

  it("returns only the subdomain", () => {
    expect(niceRecordName(`${subdomain}.${zone}`, zone)).to.equal(subdomain);
  });

  it("returns the name if zone is not included", () => {
    expect(niceRecordName(subdomain, zone)).to.equal(subdomain);
  });
});

describe("test sameRecord", () => {
  it("returns true if two records are equal", () => {
    expect(sameRecord(remoteRecords[0], localRecords[0])).to.be.true;
  });

  it("returns false if two records are not equal", () => {
    expect(sameRecord(remoteRecords[1], localRecords[1])).to.be.false;
  });
});

describe("test sameDiffArr", () => {
  it("returns all items that are in the first array but not the second", () => {
    const result = sameDiffArr(remoteRecords, localRecords);
    expect(result).to.have.lengthOf(1);
    expect(result.includes(remoteRecords[1])).to.be.true;
  });

  it("returns all items that are in the second array but not the first", () => {
    const result = sameDiffArr(localRecords, remoteRecords);
    expect(result).to.have.lengthOf(2);
    expect(result.includes(localRecords[1])).to.be.true;
    expect(result.includes(localRecords[2])).to.be.true;
  });

  it("returns all items that are in the first and second array", () => {
    let result = sameDiffArr(remoteRecords, localRecords, true);
    expect(result).to.have.lengthOf(1);
    expect(result.includes(remoteRecords[0])).to.be.true;

    result = sameDiffArr(localRecords, remoteRecords, true);
    expect(result).to.have.lengthOf(1);
    expect(result.includes(localRecords[0])).to.be.true;
  });
});

describe("test partitionRecords", () => {
  describe("returns records split into 3 categories of those that are to be deleted, kept and added", () => {
    const result = partitionRecords(remoteRecords, localRecords);
    it("has 3 properties / categories", () => {
      expect(result).to.have.property("toBeDeleted");
      expect(result).to.have.property("toBeKept");
      expect(result).to.have.property("toBeAdded");
    });

    it("each category has the expected amount of records", () => {
      expect(result.toBeDeleted).to.have.lengthOf(1);
      expect(result.toBeKept).to.have.lengthOf(1);
      expect(result.toBeAdded).to.have.lengthOf(2);
    });

    it("each category has the expected records", () => {
      expect(result.toBeDeleted.includes(remoteRecords[1])).to.be.true;
      expect(result.toBeKept.includes(remoteRecords[0])).to.be.true;
      expect(result.toBeAdded.includes(localRecords[1])).to.be.true;
      expect(result.toBeAdded.includes(localRecords[2])).to.be.true;
    });
  });
});
