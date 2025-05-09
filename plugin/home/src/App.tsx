import { FiSearch, FiInfo, FiCheckCircle, FiAlertTriangle, FiXCircle, FiClock } from "react-icons/fi";
import { useEffect, useState } from "react";
import { UseGenerateTheme } from "deweb-pages/src/hooks/UseGenerateTheme";
import { ServerStatusResponse, NetworkInfo } from "./types/server";
import { QuickAccessItem } from "./QuickAccessItem";

const POLLING_INTERVAL = 1000;

export default function App() {
  const [searchQuery, setSearchQuery] = useState("");
  const [port, setPort] = useState<number | null>(null);
  const [status, setStatus] = useState<"running" | "stopped" | "starting" | "stopping" | "error" | null>(null);
  const [network, setNetwork] = useState<NetworkInfo | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchStatus = () => {
    const url = window.location.href.endsWith("/")
      ? window.location.href
      : `${window.location.href}/`;

    const urlWithoutWeb = url.endsWith("/web/index/") ? url.slice(0, -10) : url;

    fetch(`${urlWithoutWeb}/api/server/status`)
      .then((res) => res.json())
      .then((data: ServerStatusResponse) => {
        setPort(data.serverPort);
        setStatus(data.status);
        setNetwork(data.network);
        if (data.errorMessage) {
          setErrorMessage(data.errorMessage);
        } else {
          setErrorMessage(null);
        }
      })
      .catch(err => console.error("Failed to fetch port:", err))
      .finally(() => {
        setLoading(false);
      });
  };

  // On mount, fetch status and set up polling interval
  useEffect(() => {
    fetchStatus();

    // Set up polling interval to fetch status every POLLING_INTERVAL
    const intervalId = setInterval(fetchStatus, POLLING_INTERVAL);

    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  const getStatusIcon = () => {
    if (loading) return <FiClock className="mr-1 animate-pulse" />;

    switch (status) {
      case "running":
        return <FiCheckCircle className="mr-1 text-green-500" />;
      case "stopped":
        return <FiXCircle className="mr-1 text-gray-500" />;
      case "starting":
      case "stopping":
        return <FiClock className="mr-1 text-yellow-500 animate-pulse" />;
      case "error":
        return <FiAlertTriangle className="mr-1 text-red-500" />;
      default:
        return <FiInfo className="mr-1" />;
    }
  };

  const getStatusText = () => {
    if (loading) return "Connecting...";

    if (status === "error" && errorMessage) {
      return `Error: ${errorMessage}`;
    }

    if (status === "running" && network) {
      return `Connected to ${network.network} ${network.version || ''}`;
    }

    const statusMessages = {
      running: "Server running",
      stopped: "Server stopped",
      starting: "Server starting...",
      stopping: "Server stopping...",
      error: "Server error"
    };

    return statusMessages[status || "stopped"];
  };

  const getStatusClass = () => {
    if (loading) return "bg-blue-100 text-blue-800";

    const statusClasses = {
      running: "bg-green-100 text-green-800",
      stopped: "bg-gray-100 text-gray-800",
      starting: "bg-yellow-100 text-yellow-800",
      stopping: "bg-yellow-100 text-yellow-800",
      error: "bg-red-100 text-red-800"
    };

    return statusClasses[status || "stopped"];
  };

  const generateUrl = (service: string, path: string = '') => {
    const { host } = new URL(window.location.href);
    return host === "station.massa" && port
      ? `http://${service}.localhost:${port}${path}`
      : `//${service}.${host}${path}`;
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.open(generateUrl(searchQuery), '_blank');
    }
  };

  const quickAccessItems = [
    {
      path: "/explore",
      title: "Explore DeWeb",
      description: "Browse the list of all websites available in the decentralized web ecosystem",
      service: "deweb",
      pathUrl: "/explore"
    },
    {
      path: "/mns",
      title: "Massa Name System",
      description: "Decentralized naming service for users and smart contracts on the Massa blockchain",
      service: "mns"
    },
    {
      path: "/upload",
      title: "DeWeb Uploader",
      description: "Upload and manage your websites on DeWeb",
      service: "dws"
    }
  ];

  const theme = UseGenerateTheme();

  return (
    <div
      className={`${theme} bg-primary text-secondary flex flex-col items-center justify-center min-h-screen text-center gap-8 p-8 relative`}
    >
      {/* Network Status Indicator */}
      <div className={`absolute top-2 right-2 py-1 px-3 rounded-full text-xs font-medium shadow-md flex items-center ${getStatusClass()}`}>
        {getStatusIcon()}
        <span className="truncate max-w-xs">{getStatusText()}</span>
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

      <h2 className="paragraph-lg text-2xl font-bold mb-4 text-secondary">Quick Access</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full md:w-4/5 lg:w-3/4 xl:w-2/3 mb-8">
        {quickAccessItems.map((item) => (
          <QuickAccessItem
            key={item.path}
            path={item.path}
            title={item.title}
            description={item.description}
            href={generateUrl(item.service, item.pathUrl || '')}
          />
        ))}
      </div>
    </div>
  );
}
