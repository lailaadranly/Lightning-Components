import { LightningElement, wire, api, track } from "lwc";
import getSObjects from "@salesforce/apex/SObjectListSearchController.getSObjects";
import { NavigationMixin } from "lightning/navigation";
import { refreshApex } from "@salesforce/apex";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import { getPicklistValues } from "lightning/uiObjectInfoApi";
import { getObjectInfo } from "lightning/uiObjectInfoApi";

// Get SObject + Fields
import SObject_OBJECT from "@salesforce/schema/sked__Location__c";
import ID_FIELD from "@salesforce/schema/sked__Location__c.Id";
import NAME_FIELD from "@salesforce/schema/sked__Location__c.Internal_SObject_Name__c";
import ADDRESS_FIELD from "@salesforce/schema/sked__Location__c.sked__Address__c";
import VACCINE_TYPE_FIELD from "@salesforce/schema/sked__Location__c.Vaccine_Type2__c";
import BRAND_FIELD from "@salesforce/schema/sked__Location__c.Vaccine_Supply_Tags_List__c";
import AVAILABLE_DATE_FIELD from "@salesforce/schema/sked__Location__c.skedbg__Available_Date__c";
import START_DATE_FIELD from "@salesforce/schema/sked__Location__c.skedbg__Start_Date__c";
import CLOSE_DATE_FIELD from "@salesforce/schema/sked__Location__c.skedbg__Close_Date__c";
import ACTIVE_FIELD from "@salesforce/schema/sked__Location__c.Active__c";
import ARCHIVED_FIELD from "@salesforce/schema/sked__Location__c.Is_Archived__c";

// Get Vaccine + Fields
import VACCINE_OBJECT from "@salesforce/schema/skedbg__Vaccine__c";
import VACCINE_TYPE_FILTER_FIELD from "@salesforce/schema/skedbg__Vaccine__c.skedbg__Vaccine_Type__c";
import BRAND_FILTER_FIELD from "@salesforce/schema/skedbg__Vaccine__c.skedbg__Brand__c";

const COLUMNS = [
  {
    label: "SObject Name",
    fieldName: "nameUrl",
    type: "url",
    initialWidth: 300,
    typeAttributes: {
      label: { fieldName: NAME_FIELD.fieldApiName },
      target: "_top",
    },
  },
  {
    label: "Address",
    fieldName: ADDRESS_FIELD.fieldApiName,
    type: "text",
    initialWidth: 300,
  },
  {
    label: "Vaccine Type",
    fieldName: VACCINE_TYPE_FIELD.fieldApiName,
    type: "picklist",
  },
  {
    label: "Available Date",
    fieldName: AVAILABLE_DATE_FIELD.fieldApiName,
    type: "date-local",
  },
  {
    label: "Start Date",
    fieldName: START_DATE_FIELD.fieldApiName,
    type: "date-local",
  },
  {
    label: "Closing Date",
    fieldName: CLOSE_DATE_FIELD.fieldApiName,
    type: "date-local",
  },
  {
    label: "Active",
    fieldName: ACTIVE_FIELD.fieldApiName,
    type: "boolean",
    initialWidth: 100,
  },
];

const DELAY = 50;

export default class FilteredTable extends NavigationMixin(LightningElement) {
  // Initialize Search Parameters
  name = "";
  address = "";
  vaccineType = "";
  startDate = null;
  closingDate = null;
  archived = false;

  // Initialize Pagination Parameters
  totalRecords;
  pageNo;
  totalPages;
  startRecord;
  endRecord;
  end = false;
  pagelinks = [];
  isLoading = false;
  @api recordsperpage = "15";

  // Initialize Sort Parameters
  defaultSortDirection = "asc";
  sortDirection = "asc";
  sortedBy;
  doneTypingInterval = 0;
  vaccineTypePickListValues;
  brandPicklistValues;

  //Track SObject Data List
  @track SObjectList = [];
  @track recordsToDisplay;
  wiredSObjects;
  columns = COLUMNS;

  // INITIALIZE UPON LOAD
  connectedCallback() {
    const retrieveFilters = JSON.parse(localStorage.getItem("filterParam"));

    (this.name = retrieveFilters.name),
      (this.address = retrieveFilters.address),
      (this.vaccineType = retrieveFilters.vaccineType),
      (this.startDate = retrieveFilters.startDate),
      (this.closingDate = retrieveFilters.closingDate),
      (this.archived = retrieveFilters.archived);
  }

  renderedCallback() {
    // Ensure Toggle Reflects Archived Value
    var archivedInput = this.template.querySelector("[data-id='archivedId']");

    if (this.archived == true && archivedInput != null) {
      archivedInput.checked = true;
    }
  }

  // GET SObject LIST
  @wire(getSObjects, {
    name: "$name",
    address: "$address",
    vaccineType: "$vaccineType",
    startDate: "$startDate",
    closingDate: "$closingDate",
    archived: "$archived",
  })
  wiredSObjects({ error, data }) {
    if (data) {
      this.SObjectList = data.map((record) =>
        Object.assign({ nameUrl: "/location/" + record.Id }, record)
      );
      this.isLoading = true;
      this.storeFilters();
      this.setRecordsToDisplay();
    } else if (error) {
      this.error = error;
      this.SObjectList = null;
    }
  }

  // STORE SEARCH FILTERS
  storeFilters() {
    const searchFilters = {
      name: this.name,
      address: this.address,
      vaccineType: this.vaccineType,
      startDate: this.startDate,
      closingDate: this.closingDate,
      archived: this.archived,
    };

    localStorage.setItem("filterParam", JSON.stringify(searchFilters));
    console.log("filters: " + JSON.stringify(searchFilters));
  }

  // POPULATE PICKLIST FILTERS
  @wire(getObjectInfo, { objectApiName: VACCINE_OBJECT })
  vaccineInfo;

  // Vaccine Type
  @wire(getPicklistValues, {
    recordTypeId: "$vaccineInfo.data.defaultRecordTypeId",
    fieldApiName: VACCINE_TYPE_FIELD,
  })
  vaccineTypePicklist({ error, data }) {
    if (error) {
      console.error("error", error);
    } else if (data) {
      this.vaccineTypePickListValues = [
        { label: "All", value: null },
        ...data.values,
      ];
    }
  }

  // HANDLE SORT
  onHandleSort(event) {
    const { fieldName: sortedBy, sortDirection } = event.detail;
    const cloneData = [...this.data];

    cloneData.sort(this.sortBy(sortedBy, sortDirection === "asc" ? 1 : -1));
    this.data = cloneData;
    this.sortDirection = sortDirection;
    this.sortedBy = sortedBy;
  }

  // HANDLE FILTERS
  handleChange(event) {
    this[event.target.name] = event.target.value;
    console.log("change", this[event.target.name]);
  }

  handleDateChange(event) {
    this[event.target.name] = event.target.value;

    let startDateInput = this.template.querySelector("[data-id='startDateId']");
    var startDateValue = startDateInput.value;
    let closingDateInput = this.template.querySelector(
      "[data-id='closingDateId']"
    );
    var closingDateValue = closingDateInput.value;

    if (
      startDateValue != "" &&
      closingDateValue != "" &&
      startDateValue > closingDateValue
    ) {
      startDateInput.setCustomValidity(
        "Please set the Start Date to be on or before the Close Date."
      );
      closingDateInput.setCustomValidity(
        "Please set the Close Date to be on or after the Start Date."
      );
    } else {
      startDateInput.setCustomValidity(""); // if there was a custom error before, reset it
      closingDateInput.setCustomValidity(""); // if there was a custom error before, reset it
    }
    inputCmp.reportValidity(); // Tells lightning-input to show the error right away without needing interaction

    console.log("change", this[event.target.name]);
  }

  handleToggleChange(event) {
    this[event.target.name] = event.target.checked;
    console.log("change", this[event.target.name]);
  }

  handleKeyUp(event) {
    clearTimeout(this.typingTimer);
    let value = event.target.value;
    let name = event.target.name;

    this.typingTimer = setTimeout(() => {
      this[name] = value;
    }, this.doneTypingInterval);
  }

  // BUTTON ACTIONS
  clearSearch() {
    if (this.allFiltersBlank() == false) {
      this.name = "";
      this.address = "";
      this.vaccineType = "";
      this.startDate = null;
      this.closingDate = null;
      this.archived = false;
      this.SObjectList = this.data;

      this.template.querySelectorAll("lightning-input").forEach((element) => {
        if (element.type === "toggle") {
          element.checked = false;
        } else {
          element.value = null;
          element.setCustomValidity("");
          element.reportValidity();
        }
      });

      localStorage.removeItem("filterParam");
    }
  }

  allFiltersBlank() {
    if (
      this.name == "" &&
      this.address == "" &&
      this.vaccineType == "" &&
      this.startDate == null &&
      this.closingDate == null &&
      this.archived == false
    ) {
      console.log("all blank");
      return true;
    } else {
      console.log("all filled");
      return false;
    }
  }

  createNewSObject() {
    this[NavigationMixin.Navigate]({
      type: "standard__objectPage",
      attributes: {
        objectApiName: "sked__Location__c",
        actionName: "new",
      },
    });
  }

  callSObjectSetupWizard() {
    this[NavigationMixin.Navigate]({
      type: "standard__webPage",
      attributes: {
        url: "/flow/SObject_Setup",
      },
    });
  }

  // HANDLE NAVIGATION
  handleNavigate(event) {
    event.preventDefault();
    this[NavigationMixin.Navigate]({
      type: "standard__recordPage",
      attributes: {
        actionName: "view",
        recordId: event.target.dataset.id,
      },
    });
  }

  setRecordsToDisplay() {
    this.totalRecords = this.SObjectList.length;
    this.pageNo = 1;
    this.totalPages = Math.ceil(this.totalRecords / this.recordsperpage);
    this.preparePaginationList();

    for (let i = 1; i <= this.totalPages; i++) {
      this.pagelinks.push(i);
    }
    this.isLoading = false;
  }

  handleClick(event) {
    let label = event.target.label;
    if (label === "First") {
      this.handleFirst();
    } else if (label === "Previous") {
      this.handlePrevious();
    } else if (label === "Next") {
      this.handleNext();
    } else if (label === "Last") {
      this.handleLast();
    }
  }

  handleNext() {
    this.pageNo += 1;
    this.preparePaginationList();
  }

  handlePrevious() {
    this.pageNo -= 1;
    this.preparePaginationList();
  }

  handleFirst() {
    this.pageNo = 1;
    this.preparePaginationList();
  }

  handleLast() {
    this.pageNo = this.totalPages;
    this.preparePaginationList();
  }

  preparePaginationList() {
    this.isLoading = true;
    let begin = (this.pageNo - 1) * parseInt(this.recordsperpage);
    let end = parseInt(begin) + parseInt(this.recordsperpage);
    this.recordsToDisplay = this.SObjectList.slice(begin, end);

    this.startRecord = begin + parseInt(1);
    this.endRecord = end > this.totalRecords ? this.totalRecords : end;
    this.end = end > this.totalRecords ? true : false;

    const event = new CustomEvent("pagination", {
      detail: {
        SObjectList: this.recordsToDisplay,
      },
    });
    this.dispatchEvent(event);

    window.clearTimeout(this.delayTimeout);
    this.delayTimeout = setTimeout(() => {
      this.disableEnableActions();
    }, DELAY);
    this.isLoading = false;
  }

  disableEnableActions() {
    let buttons = this.template.querySelectorAll("lightning-button");

    buttons.forEach((bun) => {
      console.log("button info" + this.pageNo);
      if (bun.label === "First") {
        bun.disabled = this.pageNo === 1 ? true : false;
      } else if (bun.label === "Previous") {
        bun.disabled = this.pageNo === 1 ? true : false;
      } else if (bun.label === "Next") {
        bun.disabled = this.pageNo === this.totalPages ? true : false;
      } else if (bun.label === "Last") {
        bun.disabled = this.pageNo === this.totalPages ? true : false;
      }
    });
  }
}
