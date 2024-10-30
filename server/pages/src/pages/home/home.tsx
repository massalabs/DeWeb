import { FiSearch } from "react-icons/fi";
import { useState } from "react";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const {host} = new URL(window.location.href);
    const redirectUrl = `//${searchQuery}.${host}`;
    window.location.href = redirectUrl;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center gap-4">
      <h1 className="paragraph-lg max-w-2x">Search on DeWeb</h1>
      <form
        onSubmit={handleSearch}
        className="flex items-center  overflow-hidden bg-secondary"
      >
        <FiSearch className="text-primary ml-3 text-2xl" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="px-3 py-2 text-primary  w-full bg-secondary outline-none"
          placeholder="Enter domain"
        />
        <span className="mr-3 text-primary">.massa</span>
      </form>
    </div>
  );
}
