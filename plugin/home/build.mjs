import { execSync } from "child_process";
import fs from "fs";
import archiver from "archiver";

console.log(`Building home...`);
execSync(`npm run build`, {
  stdio: "inherit",
  env: {
    ...process.env,
    BASE_URL: "/plugin/massa-labs/deweb-plugin/",
  },
});

console.log(`Zipping home.zip...`);
const output = fs.createWriteStream(`./dist/home.zip`);
const archive = archiver('zip', {
  zlib: { level: 9 } // Sets the compression level.
});

output.on('close', function () {
  console.log(`home.zip has been created and contains ${archive.pointer()} total bytes`);
});

archive.on('error', function (err) {
  throw err;
});

archive.pipe(output);

archive.directory(`dist/`, false);

archive.finalize();
