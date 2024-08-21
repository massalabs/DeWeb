import { execSync } from "child_process";
import fs from "fs";
import archiver from "archiver";

// List of pages to build
const pages = ["brokenWebsite", "domainNotFound", "home", "notAvailable"];

for (const page of pages) {
  console.log(`Building ${page}.html...`);
  execSync(`npm run build`, {
    stdio: "inherit",
    env: {
      ...process.env,
      PAGE: page,
    },
  });

  console.log(`Zipping ${page}.html...`);
  const output = fs.createWriteStream(`./${page}.zip`);
  const archive = archiver('zip', {
    zlib: { level: 9 } // Sets the compression level.
  });

  output.on('close', function() {
    console.log(`${page}.zip has been created and contains ${archive.pointer()} total bytes`);
  });

  archive.on('error', function(err) {
    throw err;
  });

  archive.pipe(output);

  archive.directory(`dist/${page}/`, false);

  archive.finalize();
}
