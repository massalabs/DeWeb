import { GenerateTheme } from "../../hooks/GenerateTheme";

export default function NotAvailable() {
  const theme = GenerateTheme();
  return (
    <div
      className={`${theme} bg-primary text-secondary flex flex-col items-center justify-center min-h-screen text-center gap-8`}
    >
      <h1 className="text-9xl font-bold mb-4">Oops</h1>
      <p className="paragraph-italic-md max-w-2xl">
        This website isn't available on this DeWeb provider
      </p>
      <p className="paragraph-md max-w-2xl">
        If you are the owner of this website, you might want to contact the
        DeWeb provider to get your website available on this provider.
      </p>
    </div>
  );
}
