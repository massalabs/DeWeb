import { FiSearch } from "react-icons/fi";
import { useState } from "react";
import { GenerateTheme } from "../../hooks/GenerateTheme";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const { host } = new URL(window.location.href);
    const redirectUrl = `//${searchQuery}.${host}`;
    window.location.href = redirectUrl;
  };

  const theme = GenerateTheme();

  return (
    <div
      className={`${theme} bg-primary text-secondary flex flex-col items-center justify-center min-h-screen text-center gap-4`}
    >
      <h1 className="paragraph-lg text-6xl max-w-2xl">Search on DeWeb</h1>
      <form
        onSubmit={handleSearch}
        className="flex items-center overflow-hidden w-1/3 bg-secondary mt-6"
      >
        <FiSearch className="text-primary ml-3 text-2xl" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="px-3 py-2 text-primary w-full bg-secondary outline-none placeholder-primary"
          placeholder="Enter domain"
        />
        <span className="mr-3 text-primary">.massa</span>
      </form>
    </div>
  );
}
