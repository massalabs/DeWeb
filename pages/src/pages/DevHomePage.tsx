import { Tabs } from "@massalabs/react-ui-kit";

import BrokenWebsite from "./brokenWebsite/broken";
import DomainNotFound from "./domainNotFound/domainNotFound";
import Home from "./home/home";
import NotAvailable from "./notAvailable/notAvailable";

const tabsConfig = [
  {
    label: "Home",
    content: <Home />,
  },
  {
    label: "Broken Website",
    content: <BrokenWebsite />,
    onClickTab: () => console.log("tab clicked"),
  },
  {
    label: "Domain Not Found",
    content: <DomainNotFound />,
  },
  {
    label: "Not Available",
    content: <NotAvailable />,
  },
];

// This is a development page. It is used to test the different pages without a router.
function DevHomePage() {
  return (
    <>
      <Tabs tabsConfig={tabsConfig} />
    </>
  );
}

export default DevHomePage;
