import { GenerateTheme } from "../../hooks/GenerateTheme";

export default function DomainNotFound() {
  const theme = GenerateTheme();
  return (
    <div
      className={`${theme} bg-primary text-secondary flex flex-col items-center justify-center min-h-screen text-center gap-4`}
    >
      <h1 className="text-9xl font-bold mb-4">404</h1>
      <p className="paragraph-md">MNS Domain not found</p>
      <div>
        <button
          className="bg-primary border-2 border-secondary w-fit px-4 paragraph-sm"
          onClick={() => window.open("https://mns.massa.net", "_blank")}
        >
          Buy this MNS
        </button>
      </div>
    </div>
  );
}
