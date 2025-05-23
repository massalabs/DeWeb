import { UseGenerateTheme } from "../hooks/UseGenerateTheme";
import BrokenWebsite from "./brokenWebsite/broken";
import DomainNotFound from "./domainNotFound/domainNotFound";
import Home from "./home/home";
import NotAvailable from "./notAvailable/notAvailable";

// This is a development page. It is used to test the different pages without a router.
function DevHomePage() {
  const theme = UseGenerateTheme();

  return (
    <div className={`${theme} bg-primary text-secondary`}>
      <Home />
      <DomainNotFound />
      <NotAvailable />
      <BrokenWebsite />
    </div>
  );
}

export default DevHomePage;
