export const useRouter = jest.fn(() => ({
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  canGoBack: jest.fn(() => true),
}));

export const useLocalSearchParams = jest.fn(() => ({}));

export const Link = ({ children, href, ...props }: any) => {
  return children;
};
