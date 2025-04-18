declare module 'preline/dist/preline.js' {
  interface IPrelineComponent {
    autoInit(): void;
  }

  interface IPreline {
    HSStaticMethods: IPrelineComponent;
    HSOverlay: IPrelineComponent;
    HSDropdown: IPrelineComponent;
    HSCollapse: IPrelineComponent;
    HSAccordion: IPrelineComponent;
  }

  const preline: IPreline;
  export default preline;
}

interface Window {
  HSStaticMethods: any;
  HSOverlay: any;
} 