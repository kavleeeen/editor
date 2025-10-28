import { useState } from 'react';
import './FontPanel.css';

interface FontPanelProps {
  onSelectFont: (fontFamily: string) => void;
}

const FontPanel = ({ onSelectFont }: FontPanelProps) => {
  const [searchQuery, setSearchQuery] = useState('');

  const fonts = [
    'Arial',
    'Arial Black',
    'Helvetica',
    'Times New Roman',
    'Courier New',
    'Georgia',
    'Verdana',
    'Tahoma',
    'Trebuchet MS',
    'Palatino',
    'Book Antiqua',
    'Impact',
    'Comic Sans MS',
    'Lucida Console',
    'Lucida Sans Unicode',
    'Monaco',
    'Geneva',
    'Garamond',
    'Century Gothic',
    'Futura',
    'Gill Sans',
    'Baskerville',
    'Optima',
    'Franklin Gothic',
    'Didot',
    'Bodoni',
    'Calibri',
    'Cambria',
    'Candara',
    'Consolas',
    'Constantia',
    'Corbel',
    'Segoe UI',
    'San Francisco',
    'Roboto',
    'Open Sans',
    'Lato',
    'Montserrat',
    'Playfair Display',
    'Merriweather',
    'Raleway',
    'Oswald',
    'Source Sans Pro',
    'Poppins',
    'Ubuntu',
    'Dancing Script',
    'Pacifico',
    'Shadows Into Light',
    'Abril Fatface',
    'Bebas Neue'
  ];

  const filteredFonts = fonts.filter(font =>
    font.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="font-panel-container">
      <div className="font-search-container">
        <input
          type="text"
          className="font-search-input"
          placeholder="Search fonts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      <div className="font-list-container">
        {filteredFonts.map((font) => (
          <button
            key={font}
            className="font-option"
            onClick={() => onSelectFont(font)}
            style={{ fontFamily: font }}
          >
            {font}
          </button>
        ))}
        {filteredFonts.length === 0 && (
          <div className="font-no-results">No fonts found</div>
        )}
      </div>
    </div>
  );
};

export default FontPanel;

