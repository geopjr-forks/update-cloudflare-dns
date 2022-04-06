import { absurd } from 'fp-ts/lib/function'
import { toLowerCase } from 'fp-ts/lib/string'
import { RemoteRecord } from 'cloudflare'

import { ConfigRecord, ConfigRecordCommonFields } from './types'


export const niceRecordName = (rec: RemoteRecord): string => {
	const removeZone = rec.name.replace(rec.zone_name, '')
	if (removeZone === '') return '@'
	return removeZone.slice(0, -1)
}

const setCommonStuff = (rec: RemoteRecord): ConfigRecordCommonFields => {
	return {
		name: niceRecordName(rec),
		proxied: rec.proxied,
		ttl: rec.ttl,
	}
}

export const remoteRecordToConfigRecord = (rec: RemoteRecord): ConfigRecord => {
	switch (rec.type) {
		case 'A':
			return {
				...setCommonStuff(rec),
				type: 'A',
				ipv4: rec.content,
			}

		case 'AAAA':
			return {
				...setCommonStuff(rec),
				type: 'AAAA',
				ipv6: toLowerCase(rec.content),
			}

		case 'CNAME':
			return {
				...setCommonStuff(rec),
				type: 'CNAME',
				target: rec.content,
			}

			// case 'HTTPS':
			// 	return {
			// 		...setCommonStuff(rec),
			// 		type: 'HTTPS',
			// 		ipv6: toLowerCase(rec.content),
			// 	}

		case 'TXT':
			return {
				type: rec.type,
				...setCommonStuff(rec),
				content: rec.content,
			}

		case 'MX':
			return {
				type: rec.type,
				name: niceRecordName(rec),
				mailServer: rec.content,
				priority: rec.priority ?? 1,
			}
	}

	// return absurd(rec.type)
	return {
		...setCommonStuff(rec),
		type: 'A',
		ipv4: 'OH NO!',
	}
}

export const sameRecord = (
	remoteRecord: RemoteRecord,
	configRecord: ConfigRecord
): boolean => {
	if (remoteRecord.type !== configRecord.type) return false

	const niceName = niceRecordName(remoteRecord)
	if (niceName !== configRecord.name) return false

	switch (configRecord.type) {
		case 'A':
			if (remoteRecord.content !== configRecord.ipv4) return false
			if (remoteRecord.proxied !== (configRecord.proxied ?? true)) return false
			break

		case 'AAAA':
			if (
				remoteRecord.content.toLowerCase() !== configRecord.ipv6.toLowerCase()
			)
				return false
			if (remoteRecord.proxied !== (configRecord.proxied ?? true)) return false
			break

		case 'TXT':
			if (remoteRecord.content !== configRecord.content) return false
			if (remoteRecord.ttl !== configRecord.ttl) return false
			break

		case 'MX':
			if (remoteRecord.content !== configRecord.mailServer) return false
			if (remoteRecord.priority !== configRecord.priority) return false
			break

		case 'CNAME':
			if (remoteRecord.content !== configRecord.target) return false
			if (remoteRecord.ttl !== configRecord.ttl) return false
			break
	}
	return true
}

export const recordContent = (record: ConfigRecord): string => {
	switch (record.type) {
		case 'A':
			return record.ipv4
		case 'AAAA':
			return record.ipv6
		case 'TXT':
			return record.content
		case 'MX':
			return record.mailServer
		case 'CNAME':
			return record.target
	}
	// return absurd(record)
	return 'OH NO'
}

export const recordTTL = (record: ConfigRecord): number => {
	if (record.type === 'TXT') {
		return record.ttl ?? 1
	}
	return 1
}

export const printRemoteRecord = (
	record: RemoteRecord,
	full: boolean = false
): string => {
	const name = full ? `${record.name}.` : niceRecordName(record)
	return `${name}\t${record.ttl}\tIN\t${record.type}\t${
		record.priority !== undefined ? `${record.priority} ` : ''
	}${record.content}${record.type === 'MX' ? '.' : ''}`
}

export const printConfigRecord = (
	record: ConfigRecord,
	zone: string,
	full: boolean = false
): string => {
	const fullName = `${record.name === '@' ? zone : `${record.name}.${zone}`}.`
	const name = full ? fullName : record.name
	let content = recordContent(record)
	const ttl = recordTTL(record)
	switch (record.type) {
		case 'TXT':
			content = `"${content}"`
			break
		case 'MX':
			content = `${record.priority} ${content}.`
			break
	}
	return `${name}\t${ttl}\tIN\t${record.type}\t${content}`
}

export const partitionRecords = <T, U>(
	remote: T[],
	local: U[],
	comparator: (_a: T, _b: U) => boolean
): { toBeDeleted: T[]; toBeKept: T[]; toBeAdded: U[] } => {
	const toBeDeleted = remote.filter(
		(rec) =>
			local.findIndex((possiblySameRec) => comparator(rec, possiblySameRec)) ===
			-1
	)
	const toBeKept = remote.filter(
		(rec) =>
			local.findIndex((possiblySameRec) => comparator(rec, possiblySameRec)) !==
			-1
	)
	const toBeAdded = local.filter(
		(rec) =>
			remote.findIndex((possiblySameRec) =>
				comparator(possiblySameRec, rec)
			) === -1
	)

	return { toBeDeleted, toBeKept, toBeAdded }
}
