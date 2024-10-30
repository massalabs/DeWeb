export default function NotAvailable() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center gap-4">
      <h1 className="text-9xl font-bold mb-4">Oops</h1>
      <p className="paragraph-md max-w-2xl">
        This website isn't available on this DeWeb provider
      </p>
      <p className="paragraph-light-md max-w-2xl">
        If you are the owner of this website, you might want to contact the
        DeWeb provider to get your website available on this provider.
      </p>
    </div>
  );
}
