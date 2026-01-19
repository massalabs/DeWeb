import { FiClock, FiCheckCircle, FiXCircle, FiAlertTriangle, FiInfo } from "react-icons/fi";
import { NetworkInfo, ServerStatus } from "./types/server";
import { getNetworkNameByChainId } from "@massalabs/massa-web3";

type StatusProps = {
  network?: NetworkInfo;
  loading: boolean;
  status: ServerStatus | null;
  errorMessage: string | null;
};


export const Status = ({ network, loading, status, errorMessage }: StatusProps) => {

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
    
    if (!network) {
      const statusMessages = {
        running: "Server running",
        stopped: "Server stopped",
        starting: "Server starting...",
        stopping: "Server stopping...",
        error: "Server error"
      };
  
      return statusMessages[status || "stopped"];
    }

    const { name, chainId, version } = network;

    let networkTypePrecision: string | undefined = "";
    if (!name.toLowerCase().includes("mainnet") && !name.toLowerCase().includes("buildnet")) {
      networkTypePrecision = getNetworkNameByChainId(BigInt(chainId));
      networkTypePrecision = networkTypePrecision ? ` (${networkTypePrecision})` : "";
    }

    return `Connected to '${name}' node${networkTypePrecision}. version: ${version}`;
    
  };

  return (
    <div className="relative group flex items-center">
      {getStatusIcon()}
      <span className="whitespace-nowrap">{getStatusText()}</span>
      {network?.url && (
        <div className="absolute right-0 top-full mt-2 px-2 py-1 bg-gray-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
          {network.url}
        </div>
      )}
    </div>
  );
};

