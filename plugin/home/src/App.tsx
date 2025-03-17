import { FiSearch, FiGlobe, FiUpload, FiHash, FiInfo } from "react-icons/fi";
import { useEffect, useState } from "react";
import { GenerateTheme } from "deweb-pages/src/hooks/GenerateTheme";

export default function App() {
  const [searchQuery, setSearchQuery] = useState("");
  const [port, setPort] = useState("");
  const [networkName, setNetworkName] = useState<string | null>(null);
  const [networkVersion, setNetworkVersion] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount, get the port from the API by hitting /port and network info from /info
  useEffect(() => {
    const url = window.location.href.endsWith("/")
      ? window.location.href
      : `${window.location.href}/`;

    fetch(`${url}port`)
      .then((res) => res.text())
      .then((port) => setPort(port))
      .catch(err => console.error("Failed to fetch port:", err));

    fetch(`${url}info`)
      .then((res) => res.json())
      .then((info) => {
        setNetworkName(info.Network || "Unknown Network");
        setNetworkVersion(info.Version || "Unknown Version");
      })
      .catch(err => {
        console.error("Failed to fetch provider info:", err);
        setNetworkName("Unknown Network");
        setNetworkVersion("Unknown Version");
      }).finally(() => {
        setLoading(false);
      });
  }, []);

  const redirectTo = (service: string) => {
    const { host } = new URL(window.location.href);
    const url = host === "station.massa" && port
      ? `http://${service}.localhost:${port}`
      : `//${service}.${host}`;
    window.open(url, '_blank');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      redirectTo(searchQuery);
    }
  };

  const theme = GenerateTheme();

  return (
    <div
      className={`${theme} bg-primary text-secondary flex flex-col items-center justify-center min-h-screen text-center gap-8 p-8 relative`}
    >
      {/* Network Status Indicator */}
      <div className="absolute top-2 right-2 bg-secondary text-primary py-1 px-3 rounded-full text-xs font-medium shadow-md flex items-center">
        <FiInfo className="mr-1" />
        {loading ? "Connecting..." : `Connected to ${networkName} ${networkVersion}`}
      </div>

      <h1 className="paragraph-lg text-6xl max-w-2xl mb-4">Search on DeWeb</h1>
      <form
        onSubmit={handleSearch}
        className="flex items-center overflow-hidden w-full md:w-2/3 lg:w-1/2 xl:w-1/3 bg-secondary rounded-lg shadow-lg mb-8"
      >
        <button
          type="submit"
          className="text-primary ml-3 hover:text-primary/80 transition-colors"
        >
          <FiSearch className="text-2xl" />
        </button>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="px-3 py-3 text-primary w-full bg-secondary outline-none placeholder-primary"
          placeholder="Enter domain"
        />
        <span className="mr-3 text-primary">.massa</span>
      </form>

      <h2 className="text-2xl font-bold mb-4">Quick Access</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full md:w-4/5 lg:w-3/4 xl:w-2/3 mb-8">
        {/* DeWeb Homepage Card */}
        <div
          onClick={() => redirectTo('deweb')}
          className="bg-secondary text-primary p-6 rounded-lg shadow-lg cursor-pointer hover:bg-opacity-90 transition-all"
        >
          <div className="flex items-center justify-center mb-4">
            <FiGlobe className="text-4xl" />
          </div>
          <h3 className="text-xl font-bold mb-2">DeWeb</h3>
          <p className="text-sm">Search for websites and browse the list of websites uploaded on DeWeb</p>
        </div>

        {/* MNS Card */}
        <div
          onClick={() => redirectTo('mns')}
          className="bg-secondary text-primary p-6 rounded-lg shadow-lg cursor-pointer hover:bg-opacity-90 transition-all"
        >
          <div className="flex items-center justify-center mb-4">
            <FiHash className="text-4xl" />
          </div>
          <h3 className="text-xl font-bold mb-2">Massa Name System</h3>
          <p className="text-sm">Decentralized naming service for users and smart contracts on the Massa blockchain</p>
        </div>

        {/* DeWeb Uploader Card */}
        <div
          onClick={() => redirectTo('dws')}
          className="bg-secondary text-primary p-6 rounded-lg shadow-lg cursor-pointer hover:bg-opacity-90 transition-all"
        >
          <div className="flex items-center justify-center mb-4">
            <FiUpload className="text-4xl" />
          </div>
          <h3 className="text-xl font-bold mb-2">DeWeb Uploader</h3>
          <p className="text-sm">Upload and manage your websites on DeWeb</p>
        </div>
      </div>
    </div>
  );
}
