import { htmlToText } from "html-to-text";

export const getDescriptionFor = (content: string) => {
  const limit = 50;
  const more = "...";
  const textContent = htmlToText(content, {
    wordwrap: false,
  });
  const description =
    textContent.length > limit
      ? `${textContent.slice(0, limit - more.length)}${more}`
      : textContent;

  return description;
};
