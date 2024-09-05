import { Button } from "@massalabs/react-ui-kit";

export default function DomainNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center bg-secondary">
      <h1 className="text-9xl font-bold mb-4">404</h1>
      <p className="text-2xl font-bold mb-4">MNS Domain not found</p>
      <div>
        <Button onClick={() => window.open("https://mns.massa.net", "_blank")}>
          Buy this MNS
        </Button>
      </div>
    </div>
  );
}
