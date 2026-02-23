export const TEXT = {
  GENERAL: {
    NAVIGATION: {
      BACK_TO_LIST: 'common.navigation.backToList',
      BACK: 'common.navigation.back',
    },
    BUTTONS: {
      SAVE: 'common.buttons.save',
      CANCEL: 'common.buttons.cancel',
      LOADING: 'common.buttons.loading',
    },
  },
  MENU: {
    SIDEBAR: {
      BUSINESS: {
        NAME: 'menu.sidebar.business.name',
      },
      FILES: 'menu.sidebar.files',
      PATIENTS: 'menu.sidebar.patients',
      DASHBOARD: 'menu.sidebar.dashboard',
      CUSTOMERS: 'menu.sidebar.customers',
      ABOUT: 'menu.sidebar.about',
      SETTINGS: 'menu.sidebar.settings',
    },
  },
  USERS: {
    LIST: {
      TITLE: 'users.list.title',
      SEARCH_PLACEHOLDER: 'users.list.search_placeholder',
      SECURITY_TITLE: 'users.list.security_title',
      SECURITY_DESC: 'users.list.security_description',
      ROLES: {
        ALL: 'users.list.roles.all',
        ADMIN: 'users.list.roles.admin',
        DOCTOR: 'users.list.roles.doctor',
        STAFF: 'users.list.roles.staff',
      },
    },
    CREATE: {
      LAYOUT_TITLE: 'users.create.layoutTitle',
      TITLE: 'users.create.title',
      DESCRIPTION: 'users.create.description',
      SUBMIT: 'users.create.form.submit',
      FORM: {
        FULL_NAME: 'users.create.form.fullName',
        FULL_NAME_PLACEHOLDER: 'users.create.form.fullNamePlaceholder',
        EMAIL: 'users.create.form.email',
        EMAIL_PLACEHOLDER: 'users.create.form.emailPlaceholder',
        PASSWORD: 'users.create.form.password',
        PASSWORD_PLACEHOLDER: 'users.create.form.passwordPlaceholder',
        ROLE: 'users.create.form.role',
        SPECIALTY: 'users.create.form.specialty',
        SPECIALTY_PLACEHOLDER: 'users.create.form.specialtyPlaceholder',
        SUBMIT: 'users.create.form.submit',
      },
      ROLES: {
        OWNER: 'users.create.roles.OWNER',
        ADMIN: 'users.create.roles.ADMIN',
        DOCTOR: 'users.create.roles.DOCTOR',
        STAFF: 'users.create.roles.STAFF',
      },
    },
  },
} as const;
