export default function NotAvailable() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center bg-secondary">
      <h1 className="text-9xl font-bold mb-4">Oops</h1>
      <p className="text-2xl font-bold mb-2">
        This website isn't available on this DeWeb provider
      </p>
      <p className="text-md mb-4 max-w-xl">
        The website you are trying to access is not available on this DeWeb
        provider.
      </p>
      <p className="text-md mb-4 max-w-xl">
        If you are the owner of this website, you might want to contact the
        DeWeb provider to get your website available on this provider.
      </p>
    </div>
  );
}
