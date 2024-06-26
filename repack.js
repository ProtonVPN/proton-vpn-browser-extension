const {
	existsSync,
	readFileSync,
	unlinkSync,
	writeFileSync
} = require('node:fs');
const decompress = require('decompress');
const { execSync } = require('node:child_process');

const source = process.argv[2];
const tempDir = '__temp';
const timeFile = 'commit-time.txt';

const command = (input, options) => {
	try {
		return execSync(input, options);
	} catch (error) {
		if (error.stdout) {
			throw new Error(error.stdout.toString());
		}

		throw error;
	}
};

decompress(source, tempDir).then(files => {
	const dest = process.argv[3] || source;

	if (existsSync(dest)) {
		unlinkSync(dest);
	}

	if (!existsSync(timeFile)) {
		writeFileSync(timeFile, `${(Number(process.env.COMMIT_TIME) * 1000) || Date.now()}`);
	}

	const time = Number(readFileSync(timeFile)) || Date.now();
	const date = new Date(time);

	command(`find . -exec touch -t "${date.toISOString().substring(0, 16).replace(/\D/g, '')}" '{}' +`, {
		cwd: tempDir,
		env: {
			...process.env,
			TZ: 'UTC',
		},
	});
	const filePaths = [];
	files.forEach(file => {
		if (file.type === 'file') {
			filePaths.push(file.path);
		}
	});
	filePaths.sort();
	filePaths.forEach(filePath => {
		command(`zip -rq -J -D -X -9 --compression-method deflate ../${dest} ${filePath}`, {cwd: tempDir});
	});
	command(`rm -rf ${tempDir}`);
}).catch(error => {
	console.error(error);
});
