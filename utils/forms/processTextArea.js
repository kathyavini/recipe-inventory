// Process <textarea> input separated by new lines + dash into arrays of strings
const processTextArea = (string) => {
  // No input/text field blank
  if (string === '') return [];

  // Split on newline
  let listArray = string.split(/\r?\n/);

  const trimmedArray = listArray.map((line) => {
    // Remove leading dash and space (if included)
    return line.replace(/[-][ ]?/, '');
  });

  return trimmedArray;
};

module.exports = processTextArea;
