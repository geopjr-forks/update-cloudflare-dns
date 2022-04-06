/**
 * @typedef {"A" | "AAAA" | "CNAME" | "MX" | "TXT"} DnsType
 */

/**
 * @typedef {Object} DnsRecord A DNS record
 * @property {DnsType} type The record type
 * @property {string} name The record name
 * @property {number} ttl The record TTL (1 = auto)
 * @property {boolean?} proxied Whether record should be proxied
 * @property {number?} priority The record priority (ONLY MX)
 */

/**
 * Cleans the record name.
 * @param {string} name The record name
 * @param {string} zone The record zone / domain
 * @returns {string} The clean record name
 */
export const niceRecordName = (name, zone) => {
  const removeZone = name.replace(new RegExp(`\.?${zone}`, "gi"), "");
  if (removeZone === "") return "@";
  return removeZone;
};

// /**
//  * Transforms a record to a CF acceptable object.
//  * @param {DnsRecord} rec The record
//  * @returns {DnsRecord} The CF acceptable record
//  */
// export const remoteRecordToConfigRecord = (rec) => {
//   const result = {
//     name: niceRecordName(rec),
//     proxied: rec.proxied,
//     ttl: rec.ttl,
//     type: rec.type,
//     content: rec.content,
//   };

//   if (rec.content === "OH NO") {
//     return { ...result, type: "A", content: "OH NO" };
//   }

//   if (rec.type === "MX") result["priority"] = rec.priority ?? 1;
//   return result;
// };

/**
 * Checks if two records are equal.
 * @param {DnsRecord} remoteRecord First record
 * @param {DnsRecord} configRecord Second record
 * @returns {boolean} Whether they are equal
 */
export const sameRecord = (remoteRecord, configRecord) => {
  const zone = remoteRecord.zone_name || configRecord.zone_name;
  return (
    remoteRecord.type === configRecord.type &&
    remoteRecord.content === configRecord.content &&
    (remoteRecord.proxied ?? true) === (configRecord.proxied ?? true) &&
    remoteRecord?.ttl === configRecord?.ttl &&
    remoteRecord?.priority === configRecord?.priority &&
    niceRecordName(remoteRecord.name, zone) ===
      niceRecordName(configRecord.name, zone)
  );
};

/**
 * Formats a CF record for logging.
 * @param {DnsRecord} record The record
 * @param {boolean} [full=false] Whether to use the full name of the record
 * @returns {string} The formatted record log
 */
export const printRemoteRecord = (record, full = false) => {
  const name = full
    ? `${record.name}.`
    : niceRecordName(record.name, record.zone_name);
  return `${name}\t${record.ttl}\tIN\t${record.type}\t${
    record.priority ?? ""
  } ${record.content}${record.type === "MX" ? "." : ""}`;
};

/**
 * Formats a local record for logging.
 * @param {DnsRecord} record The record
 * @param {string} zone The domain
 * @param {boolean} [full=false] Whether to use the full name of the record
 * @returns {string} The formatted record log
 */
export const printConfigRecord = (record, zone, full = false) => {
  const fullName = `${record.name === "@" ? "" : `${record.name}.`}${zone}.`;
  const name = full ? fullName : record.name;
  let content = record.content;
  const ttl = record.ttl ?? 1;
  switch (record.type) {
    case "TXT":
      content = `"${content}"`;
      break;
    case "MX":
      content = `${record.priority} ${content}.`;
      break;
  }
  return `${name}\t${ttl}\tIN\t${record.type}\t${content}`;
};

/**
 * Returns either the items that appear on both or neither record arrays.
 * @param {DnsRecord[]} x The array of records that will return missing items.
 * @param {DnsRecord[]} y The array of records that will the other array will check against.
 * @param {boolean} [same=false] Whether to return the items that appear in both arrays
 * @returns {DnsRecord[]} The items that either appear in both or neither of the arrays
 */
export const sameDiffArr = (x, y, same = false) => {
  return same
    ? x.filter((el1) => y.some((el2) => sameRecord(el2, el1)))
    : x.filter((el1) => y.every((el2) => !sameRecord(el2, el1)));
};

/**
 * @typedef {Object} Partition DNS records that will be kept, deleted or added between two arrays of records.
 * @property {DnsRecord[]} toBeDeleted Array of records that are going to be deleted
 * @property {DnsRecord[]} toBeKept Array of records that are going to be kept
 * @property {DnsRecord[]} toBeAdded Array of records that are going to be added
 */

/**
 * Retruns an object with the records that will be kept, deleted or added between remote and local records.
 * @param {DnsRecord[]} remote The array of CF records
 * @param {DnsRecord[]} local The array of local records
 * @returns {Partition} The object of records split in categories of those that will be added, kept or removed
 */
export const partitionRecords = (remote, local) => {
  const toBeDeleted = sameDiffArr(remote, local);
  const toBeKept = sameDiffArr(remote, local, true);
  const toBeAdded = sameDiffArr(local, remote);

  return { toBeDeleted, toBeKept, toBeAdded };
};
