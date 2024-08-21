export default function BrokenWebsite() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center bg-secondary">
      <h1 className="text-9xl font-bold mb-4">Oops</h1>
      <p className="text-2xl font-bold mb-2">This website seems not to work</p>
      <p className="text-md mb-4 max-w-xl">
        The target of this MNS domain might not be a website, or this website
        might not work. Please try refreshing the page in a few minutes.
      </p>
      <p className="text-md mb-4 max-w-xl">
        If you are the owner of this MNS domain, please check the configuration
        of your website. If you just uploaded your website, please wait a few
        minutes for the website to be available.
      </p>
    </div>
  );
}
