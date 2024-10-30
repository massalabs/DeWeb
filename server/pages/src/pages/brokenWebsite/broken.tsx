import { GenerateTheme } from "../../hooks/GenerateTheme";

export default function BrokenWebsite() {
  const theme = GenerateTheme();
  return (
    <div
      className={`${theme} bg-primary text-secondary  flex flex-col items-center justify-center min-h-screen text-center gap-8`}
    >
      <h1 className="text-9xl font-bold mb-4">Oops</h1>
      <p className="paragraph-italic-md max-w-2xl">
        This website seems not to work
      </p>
      <p className="paragraph-md max-w-2xl">
        The target of this MNS domain might not be a website, or this website
        might not work. Please try refreshing the page in a few minutes.
      </p>
      <p className="paragraph-md max-w-2xl">
        If you are the owner of this MNS domain, please check the configuration
        of your website. If you just uploaded your website, please wait a few
        minutes for the website to be available.
      </p>
    </div>
  );
}
