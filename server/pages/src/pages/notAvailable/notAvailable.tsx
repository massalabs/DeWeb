import { UseGenerateTheme } from "../../hooks/UseGenerateTheme";
import { useEffect, useState } from "react";

export default function NotAvailable() {
  const theme = UseGenerateTheme();

  const [redirectionUrl, setRedirectionUrl] = useState("");

  useEffect(() => {
    const { hostname, pathname, search: queryParams } = window.location;
    const currentDomain = hostname.split(".")[0];

    const mnsUrl = `${currentDomain}.massa${pathname}${queryParams}`;
    setRedirectionUrl(`https://deweb.massa.network/deweb_redirect?deweb_url="${mnsUrl}"`);
  }, []);

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
      <p className="paragraph-md max-w-2xl">
        You can also try to access the website using another DeWeb provider or by running your own one:
        <a
          href={redirectionUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 underline"
        >
          Find another provider
        </a>
      </p>
    </div>
  );
}
