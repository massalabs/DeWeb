

import BrokenWebsite from "./brokenWebsite/broken";
import DomainNotFound from "./domainNotFound/domainNotFound";
import Home from "./home/home";
import NotAvailable from "./notAvailable/notAvailable";


// This is a development page. It is used to test the different pages without a router.
function DevHomePage() {
  return (
    <div
    >
      <Home/>
      <DomainNotFound/>
      <NotAvailable/>
      <BrokenWebsite/>
    </div>
  );
}

export default DevHomePage;
