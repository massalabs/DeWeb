import { Tabs } from "@massalabs/react-ui-kit";

import BrokenWebsite from "./pages/brokenWebsite/broken";
import DomainNotFound from "./pages/domainNotFound/domainNotFound";
import Home from "./pages/home/home";

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
];

const args = {
  tabsConfig,
  defaultIndex: 1,
};

function App() {
  return (
    <>
      <Tabs {...args} />
    </>
  );
}

export default App;
