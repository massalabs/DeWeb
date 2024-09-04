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
    <div className="flex flex-col items-center justify-center min-h-screen text-center">
      <h1 className="text-6xl font-bold mb-4">Search on DeWeb</h1>
      <form
        onSubmit={handleSearch}
        className="flex items-center rounded-lg overflow-hidden bg-white"
      >
        <FiSearch className="text-gray-500 ml-3 text-2xl" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="px-3 py-2 outline-none text-2xl w-full"
          placeholder="Enter domain"
        />
        <span className="mr-3 text-gray-500 text-2xl">.massa</span>
      </form>
    </div>
  );
}
