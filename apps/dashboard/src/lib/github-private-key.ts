function base64ToBytes(base64: string) {
	const binary = atob(base64.replace(/\s+/g, ""));
	const bytes = new Uint8Array(binary.length);
	for (let index = 0; index < binary.length; index += 1) {
		bytes[index] = binary.charCodeAt(index);
	}

	return bytes;
}

function bytesToBase64(bytes: Uint8Array) {
	let binary = "";
	const chunkSize = 0x8000;
	for (let index = 0; index < bytes.length; index += chunkSize) {
		const chunk = bytes.subarray(index, index + chunkSize);
		binary += String.fromCharCode(...chunk);
	}

	return btoa(binary);
}

function encodeDerLength(length: number) {
	if (length < 0x80) {
		return Uint8Array.from([length]);
	}

	const bytes: number[] = [];
	let remaining = length;
	while (remaining > 0) {
		bytes.unshift(remaining & 0xff);
		remaining >>= 8;
	}

	return Uint8Array.from([0x80 | bytes.length, ...bytes]);
}

function encodeDer(tag: number, content: Uint8Array) {
	const length = encodeDerLength(content.length);
	const output = new Uint8Array(1 + length.length + content.length);
	output[0] = tag;
	output.set(length, 1);
	output.set(content, 1 + length.length);
	return output;
}

function concatBytes(...parts: Uint8Array[]) {
	const length = parts.reduce((total, part) => total + part.length, 0);
	const output = new Uint8Array(length);
	let offset = 0;
	for (const part of parts) {
		output.set(part, offset);
		offset += part.length;
	}

	return output;
}

function wrapBase64(base64: string) {
	return base64.match(/.{1,64}/g)?.join("\n") ?? base64;
}

function extractPemBody(privateKey: string, label: string) {
	return privateKey
		.replace(`-----BEGIN ${label}-----`, "")
		.replace(`-----END ${label}-----`, "")
		.replace(/\s+/g, "");
}

function convertPkcs1ToPkcs8(privateKey: string) {
	const pkcs1Der = base64ToBytes(extractPemBody(privateKey, "RSA PRIVATE KEY"));
	const version = Uint8Array.from([0x02, 0x01, 0x00]);
	const rsaEncryptionOid = Uint8Array.from([
		0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01,
	]);
	const algorithmIdentifier = encodeDer(
		0x30,
		concatBytes(rsaEncryptionOid, Uint8Array.from([0x05, 0x00])),
	);
	const privateKeyOctetString = encodeDer(0x04, pkcs1Der);
	const privateKeyInfo = encodeDer(
		0x30,
		concatBytes(version, algorithmIdentifier, privateKeyOctetString),
	);

	return `-----BEGIN PRIVATE KEY-----\n${wrapBase64(bytesToBase64(privateKeyInfo))}\n-----END PRIVATE KEY-----`;
}

export function normalizeGitHubAppPrivateKey(privateKey: string) {
	const normalizedPrivateKey = privateKey.replace(/\\n/g, "\n").trim();
	if (normalizedPrivateKey.includes("-----BEGIN RSA PRIVATE KEY-----")) {
		return convertPkcs1ToPkcs8(normalizedPrivateKey);
	}

	return normalizedPrivateKey;
}
