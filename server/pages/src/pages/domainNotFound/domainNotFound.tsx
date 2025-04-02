import { UseGenerateTheme } from "../../hooks/UseGenerateTheme";
import Avara404 from "../../assets/404_avara.svg?react";
import Old404 from "../../assets/404_old.svg?react";
import Format404 from "../../assets/404_format.svg?react";
import Linux404 from "../../assets/404_linux.svg?react";
import Pixel404 from "../../assets/404_pixel.svg?react";

export default function DomainNotFound() {
  const width = 320;
  const height = 120;

  const images = [
    <Avara404 width={width} height={height} />,
    <Old404 width={width} height={height} />,
    <Format404 width={width} height={height} />,
    <Linux404 width={width} height={height} />,
    <Pixel404 width={width} height={height} />,
  ];
  const theme = UseGenerateTheme();
  return (
    <div
      className={`${theme} bg-primary text-secondary flex flex-col items-center justify-center min-h-screen text-center gap-8`}
    >
      {images[Math.floor(Math.random() * images.length)]}
      <p className="paragraph-md">MNS Domain not found</p>
      <div>
        <button
          className="bg-primary border-2 border-secondary w-fit px-4 paragraph-sm"
          onClick={() => window.open("https://mns.massa.net", "_blank")}
        >
          Buy this MNS
        </button>
      </div>
    </div>
  );
}
