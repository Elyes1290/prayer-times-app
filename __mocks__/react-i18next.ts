// Mock pour react-i18next
export const useTranslation = () => {
  return {
    t: (key: string) => key,
    i18n: {
      changeLanguage: jest.fn(),
      language: 'en',
    },
  };
};

export const initReactI18next = {
  type: '3rdParty',
  init: jest.fn(),
};

export const I18nextProvider = ({ children }: any) => children;

export const Trans = ({ children }: any) => children;

export default {
  use: jest.fn().mockReturnThis(),
  init: jest.fn().mockReturnThis(),
  t: (key: string) => key,
  changeLanguage: jest.fn(),
};
