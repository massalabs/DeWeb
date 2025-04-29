type QuickAccessItemProps = {
  path: string;
  title: string;
  description: string;
  href: string;
};
export const QuickAccessItem = ({ path, title, description, href }: QuickAccessItemProps) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="bg-secondary text-primary p-6 rounded-lg shadow-lg cursor-pointer hover:bg-opacity-90 transition-all no-underline block"
  >
    <div className="flex items-center justify-center mb-4">
      <span className="paragraph-lg text-4xl">{path}</span>
    </div>
    <h3 className="paragraph-lg text-xl font-bold mb-2">{title}</h3>
    <p className="paragraph-lg text-sm">{description}</p>
  </a>
);
