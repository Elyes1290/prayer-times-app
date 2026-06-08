export type AccountManagementState = {
  realUserData: Record<string, unknown> | null;
  userFirstName: string;
  userEmail: string;
  isLoadingUserData: boolean;
  isEditing: boolean;
  editedFirstName: string;
  editedEmail: string;
  isLoading: boolean;
  showChangePasswordModal: boolean;
};

export const initialAccountManagementState: AccountManagementState = {
  realUserData: null,
  userFirstName: "",
  userEmail: "",
  isLoadingUserData: true,
  isEditing: false,
  editedFirstName: "",
  editedEmail: "",
  isLoading: false,
  showChangePasswordModal: false,
};

export type AccountManagementAction =
  | { type: "SET_REAL_USER_DATA"; payload: Record<string, unknown> | null }
  | {
      type: "SET_PROFILE";
      payload: { firstName: string; email: string };
    }
  | { type: "SET_LOADING_USER_DATA"; payload: boolean }
  | { type: "SET_EDITING"; payload: boolean }
  | { type: "SET_EDITED_FIRST_NAME"; payload: string }
  | { type: "SET_EDITED_EMAIL"; payload: string }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_SHOW_CHANGE_PASSWORD_MODAL"; payload: boolean }
  | { type: "CANCEL_EDIT" };

export function accountManagementReducer(
  state: AccountManagementState,
  action: AccountManagementAction,
): AccountManagementState {
  switch (action.type) {
    case "SET_REAL_USER_DATA":
      return { ...state, realUserData: action.payload };
    case "SET_PROFILE":
      return {
        ...state,
        userFirstName: action.payload.firstName,
        userEmail: action.payload.email,
        editedFirstName: action.payload.firstName,
        editedEmail: action.payload.email,
      };
    case "SET_LOADING_USER_DATA":
      return { ...state, isLoadingUserData: action.payload };
    case "SET_EDITING":
      return { ...state, isEditing: action.payload };
    case "SET_EDITED_FIRST_NAME":
      return { ...state, editedFirstName: action.payload };
    case "SET_EDITED_EMAIL":
      return { ...state, editedEmail: action.payload };
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "SET_SHOW_CHANGE_PASSWORD_MODAL":
      return { ...state, showChangePasswordModal: action.payload };
    case "CANCEL_EDIT":
      return {
        ...state,
        isEditing: false,
        editedFirstName: state.userFirstName,
        editedEmail: state.userEmail,
      };
    default:
      return state;
  }
}
