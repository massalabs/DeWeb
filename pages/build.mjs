import { execSync } from "child_process";

// List of pages to build
const pages = ["brokenWebsite", "domainNotFound", "home", "notAvailable"];

for (const page of pages) {
  console.log(`Building ${page}.html...`);
  execSync(`PAGE=${page} npm run build`, { stdio: "inherit" });

  console.log(`Zipping ${page}.html...`);
  execSync(`zip -r ../../${page}.zip ./*`, { stdio: "inherit", cwd: `dist/${page}` });
}
