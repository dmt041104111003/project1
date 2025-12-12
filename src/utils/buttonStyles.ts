export const getDisabledButtonStyles = () => {
  return 'bg-gray-400 text-gray-600 border-2 border-gray-500 cursor-not-allowed';
};

export const getButtonStyles = (color: string, disabled: boolean = false) => {
  if (disabled) {
    return getDisabledButtonStyles();
  }
  
  const colorMap: Record<string, string> = {
    orange: 'bg-blue-100 text-black hover:bg-blue-200 border-2 border-blue-300',
    purple: 'bg-blue-100 text-black hover:bg-blue-200 border-2 border-blue-300',
    red: 'bg-blue-100 text-black hover:bg-blue-200 border-2 border-blue-300',
    blue: 'bg-blue-100 text-black hover:bg-blue-200 border-2 border-blue-300',
    green: 'bg-blue-100 text-black hover:bg-blue-200 border-2 border-blue-300',
    yellow: 'bg-blue-100 text-black hover:bg-blue-200 border-2 border-blue-300',
    white: 'bg-white text-black hover:bg-gray-100 border-2 border-black',
  };
  
  return colorMap[color] || colorMap.blue;
};

