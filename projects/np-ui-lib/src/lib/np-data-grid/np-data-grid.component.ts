import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnDestroy, OnInit, Output, TemplateRef, ViewEncapsulation, ViewChild, ViewContainerRef, ElementRef, AfterContentInit, AfterViewInit } from '@angular/core';
import { BehaviorSubject, Subscription } from 'rxjs';
import { TemplatePortal } from '@angular/cdk/portal';
import { OverlayRef, ConnectedPosition, Overlay, OverlayPositionBuilder } from '@angular/cdk/overlay';
import { Column } from './models/column.model';
import { Constants, DataTypes, FilterTypes, SortDirections } from './models/constants';
import { DataSource } from './models/data-source.model';
import { LoadOptions } from './models/load-options.model';
import { Pager } from './models/pager.model';
import { State } from './models/state.model';
import { NpFileService } from './services/np-file.service';
import { NpFilterService } from './services/np-filter.service';
import { NpODataService } from './services/np-odata.service';
import { NpPagerService } from './services/np-pager.service';
import { NpGridUtilityService } from './services/np-grid-utility.service';
import { NpModalComponent } from '../np-modal/np-modal.component';

@Component({
  selector: 'np-data-grid',
  templateUrl: 'np-data-grid.component.html',
  styleUrls: ['np-data-grid.component.css'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.Default
})
export class NpDataGridComponent implements OnInit, AfterContentInit, AfterViewInit, OnDestroy {

  @Input() columns: Column[];
  _columns: Column[];

  @Input() dataSource: BehaviorSubject<DataSource>;
  _dataSource: DataSource;
  _subscription: Subscription;

  /**current view data */
  _currentViewData: any[];

  _pager: Pager;

  _total: number = 0;

  _filtersList: any[];

  // set grid height
  @Input() height: number;
  // set grid width
  @Input() width: number;

  @Input() multiColumnSortEnable: boolean;
  _sortColumnList: any[];
  _filterColumnList: any[];
  _isFilterAvailable: boolean;

  _enableMasterChild: boolean = false;
  @Input() masterDetailTemplate: TemplateRef<any>;
  @Input() singleRowExpand: boolean = false;
  @Input() expandRowOnClick: boolean = false;
  _openRowKeys: any[] = [];

  @Input() singleRowSelectEnable: boolean = false;
  @Input() multiRowSelectEnable: boolean = false;
  @Input() selectRowOnClick: boolean = false;
  _selectedRowKeys: any[] = [];
  _isAllSelected: boolean;
  @Output() onSelect: EventEmitter<any> = new EventEmitter();
  @Output() onDeselect: EventEmitter<any> = new EventEmitter();

  @Input() key: string;
  _key: string;

  @Output() onRowClick: EventEmitter<any> = new EventEmitter();

  _dataTypes = DataTypes;
  _sortDirections = SortDirections;

  @Input() showColumnChooser: boolean;
  _isOpenColumnChooser: boolean = false;

  _visibleColumns: any[] = [];

  @Input() title: string = "";

  @Input() enableStateStoring: boolean;
  _stateList: State[];
  _currentStateName: string;
  @Output() onStatesUpdate: EventEmitter<any> = new EventEmitter();

  @Input() noDataMessage: string = "No Data Found.";

  @Input() showFilters: boolean = true;

  @Output() onInit: EventEmitter<any> = new EventEmitter();
  @Output() onAfterInit: EventEmitter<any> = new EventEmitter();

  @Input() showSummary: boolean = false;
  @Input() summaryTemplate: TemplateRef<any>;
  _summaryData: any;

  @Input() allowColumnResize: boolean = false;
  @Input() allowColumnReorder: boolean = false;

  @Output() onLoadData: EventEmitter<LoadOptions> = new EventEmitter();
  @Input() isServerOperations: boolean = false;

  @Input() isODataOperations: boolean = false;

  @Input() allowExport: boolean = false;
  @Input() isServerExport: boolean = false;
  @Output() onServerExport: EventEmitter<LoadOptions> = new EventEmitter();

  @Input() showToolBar: boolean = false;

  @Input() pageSize: number = 10;

  @Input() styleClass: string;

  _searchColumnsKeyword: string;

  @ViewChild("columnChooserTemplate") columnChooserTemplate: TemplateRef<any>;
  private columnChooserTemplatePortal: TemplatePortal<any>;
  private columnChooserOverlayRef: OverlayRef;

  @ViewChild("saveNewStateModal") saveNewStateModal: NpModalComponent;
  @ViewChild("editStateModal") editStateModal: NpModalComponent;
  @ViewChild("deleteStateModal") deleteStateModal: NpModalComponent;
  _stateName: string;
  _nameAlreadyExistError: boolean = false;

  constructor(private pagerService: NpPagerService,
    private filterService: NpFilterService,
    private utilityService: NpGridUtilityService,
    private oDataService: NpODataService,
    private fileService: NpFileService,
    public overlay: Overlay,
    private _viewContainerRef: ViewContainerRef,
    private overlayPositionBuilder: OverlayPositionBuilder,
    private elementRef: ElementRef) {
    this._sortColumnList = [];
    this._filtersList = Constants.filters();
    this._filterColumnList = [];
    this._stateList = [];
    this._currentStateName = "";
    this._isFilterAvailable = false;
    this.showFilters = true;
  }

  ngOnInit() {
    this.onInit.emit();
  }

  ngAfterContentInit() {
    if (this.masterDetailTemplate) {
      this._enableMasterChild = true;
    }
    this._setColumns();
    if (this.key) {
      this._key = this.key;
    } else {
      this._key = this._columns[0].dataField;
    }
    this.subscribeDataSource();
    if (this.isServerOperations) {
      this._getCurrentViewData(1);
    }
  }

  ngAfterViewInit() {
    var position: ConnectedPosition[] = [
      {
        originX: "start",
        originY: "bottom",
        overlayX: "start",
        overlayY: "top"
      },
      {
        originX: "start",
        originY: "top",
        overlayX: "start",
        overlayY: "bottom"
      }
    ];
    const positionStrategy = this.overlayPositionBuilder
      .flexibleConnectedTo(this.elementRef.nativeElement.querySelector("#btn-column-chooser"))
      .withPositions(position);
    this.columnChooserOverlayRef = this.overlay.create({
      positionStrategy,
      hasBackdrop: true,
      backdropClass: "np-dg-backdrop",
      scrollStrategy: this.overlay.scrollStrategies.reposition()
    });
    this.columnChooserTemplatePortal = new TemplatePortal(
      this.columnChooserTemplate,
      this._viewContainerRef
    );
    this.columnChooserOverlayRef.backdropClick().subscribe(() => this._closeColumnChooser());
    this.onAfterInit.emit();
  }

  private subscribeDataSource() {
    this._subscription = this.dataSource.subscribe((data: DataSource) => {
      if (data === undefined || data === null) {
        return;
      }
      if (this.isServerOperations) {
        // to export to csv, this change has all data
        if (data.isAllPages) {
          this.fileService.downloadCSVFile(data.data, this._visibleColumns);
          return;
        }
        this._currentViewData = data.data;
        this._summaryData = data.summary;
        this._total = data.total;
        if (this._isAllSelected) {
          for (let element of this._currentViewData) {
            if (this._selectedRowKeys.indexOf(element[this._key]) === -1) {
              this._selectedRowKeys.push(element[this._key]);
            }
          }
        }
        this._pager = this.pagerService.getPager(this._total, this._pager.currentPage, this.pageSize);
      }
      else {
        var dataSource = new DataSource(data.data, data.data.length, data.summary);
        this._dataSource = dataSource;
        this._total = this._dataSource.total;
        this._summaryData = this._dataSource.summary;
        this._getCurrentViewData(1);
      }
    });
  }

  ngOnDestroy(): void {
    if (this._subscription) {
      this._subscription.unsubscribe();
    }
  }

  _getCurrentViewData(currentPageNumber: number) {
    if (currentPageNumber === 0) {
      currentPageNumber = 1;
    }
    if (this._pager && this._pager.totalPages > 0 && currentPageNumber > this._pager.totalPages) {
      currentPageNumber = this._pager.totalPages;
    }
    this._pager = this.pagerService.getPager(this._total, currentPageNumber, this.pageSize);
    if (this.isServerOperations) {
      var loadOpt = new LoadOptions();
      if (this.isODataOperations) {
        var top = this.pageSize;
        var skip = (currentPageNumber - 1) * this.pageSize;
        loadOpt.odataQuery = this.oDataService.buildQuery(top, skip, this._sortColumnList, this._filterColumnList);
        loadOpt.pageNumber = 0;
        loadOpt.pageSize = 0;
        loadOpt.sortColumns = [];
        loadOpt.filterColumns = [];
        loadOpt.isAllPages = false;
      } else {
        loadOpt.pageNumber = currentPageNumber;
        loadOpt.pageSize = this.pageSize;
        loadOpt.sortColumns = this._sortColumnList;
        loadOpt.filterColumns = this._filterColumnList;
        loadOpt.isAllPages = false;
        loadOpt.odataQuery = "";
      }
      this.onLoadData.emit(loadOpt);
    } else {
      this._currentViewData = this._dataSource.data.slice(this._pager.startIndex, this._pager.endIndex + 1);
    }
  }

  _setColumns() {
    var result = [];
    for (let element of this.columns) {
      result.push(new Column(element));
    }
    this._columns = result;
    this._setVisibleColumns();
  }

  _setVisibleColumns() {
    this._visibleColumns = this.utilityService.custFilter(this._columns, function (element: Column) { if (element.visible === true) { return element } });
    this._isFilterAvailable = this.utilityService.custFilter(this._columns, function (element) { if (element.filterEnable === true && element.visible === true) { return element } }).length > 0;
  }

  _onPageSizeChange() {
    this._getCurrentViewData(1);
  }

  _onCellClick($event: any, column: Column, data: any) {
    if (column.onCellClick != undefined) {
      column.onCellClick($event, column, data)
    }
  }

  // on first click ascending, on second click descending and on third click remove sorting
  _onSort(column: Column) {
    if (!column.sortEnable) {
      return;
    }
    // if sort direction is descending then remove sorting from column
    if (column.sortDirection === SortDirections.Descending) {
      this._removeSortingFromColumn(column);
      return;
    }
    var sortOrder = column.sortDirection === SortDirections.Ascending ? SortDirections.Descending : SortDirections.Ascending;
    if (!this.multiColumnSortEnable) {
      this._removeAllSorting();
    }
    column.sortDirection = sortOrder;
    if (this.multiColumnSortEnable) {
      var list = [];
      for (let element of this._sortColumnList) {
        if (element.dataField !== column.dataField) {
          list.push(element);
        }
      }
      this._sortColumnList = list;
    }
    this._sortColumnList.push({ dataField: column.dataField, sortDirection: column.sortDirection });
    this._selectedRowKeys = [];
    this._isAllSelected = false;
    this._openRowKeys = [];
    if (!this.isServerOperations) {
      this._sortDataSource();
    }
    this._getCurrentViewData(1);
  }

  _sortDataSource() {
    var data = this._dataSource.data;
    for (let element of this._sortColumnList) {
      data = this.utilityService.custSort(data, element.dataField, element.sortDirection);
    }
    this._dataSource.data = data;
  }

  _removeAllSorting() {
    for (let element of this._columns) {
      element.sortDirection = null;
    }
    this._sortColumnList = [];
  }

  _removeSortingFromColumn(column: Column) {
    column.sortDirection = null;
    var list = [];
    for (let element of this._sortColumnList) {
      if (element.dataField !== column.dataField) {
        list.push(element);
      }
    }
    this._sortColumnList = list;

    if (!this.isServerOperations) {
      this._resetDataSource();
      this._filterDataSource();
      for (let element of this._sortColumnList) {
        this._dataSource.data = this.utilityService.custSort(this._dataSource.data, element.dataField, element.sortDirection);
      }
    }
    this._getCurrentViewData(1);
  }

  _resetDataSource() {
    this._dataSource.data = this.dataSource.getValue().data;
    this._total = this._dataSource.data.length;
  }

  _onFilter(column: Column, isForceFilter: boolean = false) {
    if (column.filterOperator && column.filterOperator === FilterTypes.Reset) {
      column.filterOperator = undefined;
      column.filterValue = undefined;
      isForceFilter = true;
    }
    if (!isForceFilter && (column.filterValue === undefined || column.filterValue === null || column.filterValue.length === 0
      || column.filterOperator === undefined || column.filterOperator === null)) {
      return;
    }
    var currentFilterList = [];
    for (let element of this._columns) {
      if (element.filterOperator === undefined || element.filterOperator === null
        || element.filterValue === undefined || element.filterValue === null || element.filterValue.toString().length === 0) {
        continue;
      }
      else {
        currentFilterList.push({ dataField: element.dataField, filterOperator: element.filterOperator, filterValue: element.filterValue, dataType: element.dataType });
      }
    }
    this._filterColumnList = currentFilterList;
    this._selectedRowKeys = [];
    this._isAllSelected = false;
    this._openRowKeys = [];
    if (!this.isServerOperations) {
      this._filterDataSource();
      this._sortDataSource();
    }
    this._getCurrentViewData(1);
  }

  _filterDataSource() {
    var filterdData = this.filterService.filterData(this._filterColumnList, this.dataSource.getValue().data);
    this._dataSource.data = filterdData;
    this._total = filterdData.length;
  }

  _removeAllFilters() {
    for (let element of this._columns) {
      element.filterOperator = null;
      element.filterValue = null;
    }
    this._filterColumnList = [];
  }

  _onClickToggleMasterChild(keyValue: any) {
    if (this.expandRowOnClick === true) {
      return;
    }
    this._toggleMasterChild(keyValue);
  }

  _toggleMasterChild(keyValue: any) {
    var idx = this._openRowKeys.indexOf(keyValue);
    if (idx === -1) {
      if (this.singleRowExpand) {
        this._openRowKeys = [keyValue];
      } else {
        this._openRowKeys.push(keyValue);
      }
    } else {
      this._openRowKeys.splice(idx, 1);
    }
  }

  _onClickSelectAll(event: any) {
    if (this.singleRowSelectEnable) {
      return;
    }
    if (event.target.checked) {
      this._selectAll();
    } else {
      this._deSelectAll();
    }
  }

  _deSelectAll() {
    var selectedRows = this._selectedRowKeys;
    this._selectedRowKeys = [];
    this._isAllSelected = false;
    if (this.onDeselect != undefined) {
      var event = { data: selectedRows };
      this.onDeselect.emit(event);
    }
  }

  _selectAll() {
    var key = this._key;
    if (this.isServerOperations) {
      var selectedKeys = [];
      for (let element of this._currentViewData) {
        selectedKeys.push(element[key]);
      }
    } else {
      var selectedKeys = [];
      for (let element of this._dataSource.data) {
        selectedKeys.push(element[key]);
      }
    }
    this._selectedRowKeys = selectedKeys;
    this._isAllSelected = true;
    if (this.onSelect != undefined) {
      var event = { data: selectedKeys };
      this.onSelect.emit(event);
    }
  }

  _onClickSelectRow(keyValue: any, event: any) {
    if (this.selectRowOnClick === true) {
      return;
    }
    this._selectRow(keyValue, event);
  }

  _selectRow(keyValue: any, event: any) {
    if (this.singleRowSelectEnable) {
      this._selectedRowKeys = [];
      if (event.target.checked) {
        this._selectedRowKeys.push(keyValue);
      }
    } else {
      if (event.target.checked) {
        this._selectedRowKeys.push(keyValue);
      } else {
        var idx = this._selectedRowKeys.indexOf(keyValue);
        this._selectedRowKeys.splice(idx, 1);
      }
    }
    if (event.target.checked) {
      if (this.onSelect != undefined) {
        event.data = keyValue;
        this.onSelect.emit(event);
      }
    } else {
      this._isAllSelected = false;
      if (this.onDeselect != undefined) {
        event.data = keyValue;
        this.onDeselect.emit(event);
      }
    }
  }

  _isSelected(keyValue: any) {
    return this._selectedRowKeys.indexOf(keyValue) > -1;
  }

  _isOpenChild(keyValue: any) {
    return this._openRowKeys.indexOf(keyValue) > -1;
  }

  _rowClick(event: any, data: any) {
    if (this.masterDetailTemplate && this.expandRowOnClick) {
      this._toggleMasterChild(data[this._key]);
    }
    if ((this.singleRowSelectEnable || this.multiRowSelectEnable) && this.selectRowOnClick) {
      if (this._isSelected(data[this._key])) {
        this._selectRow(data[this._key], { target: { checked: false } });
      } else {
        this._selectRow(data[this._key], { target: { checked: true } });
      }
    }
    if (this.onRowClick) {
      event.data = data;
      this.onRowClick.emit(event);
    }
  };

  _onColumnChoosing(col: Column) {
    col.visible = !col.visible;
    this._setVisibleColumns();
  }

  _openColumnChooser() {
    if (!this.columnChooserOverlayRef.hasAttached()) {
      this.columnChooserOverlayRef.attach(this.columnChooserTemplatePortal);
    }
  }

  _closeColumnChooser() {
    this.columnChooserOverlayRef.detach();
  }

  _dropColumn(event: CdkDragDrop<string[]>) {
    moveItemInArray(this._columns, event.previousIndex, event.currentIndex);
    this._setVisibleColumns();
  }

  /**
   * get selected row keys array
   */
  getSelectedRowKeys() {
    return this._selectedRowKeys;
  }

  /**
   * reset all
   */
  reset() {
    this._setColumns();
    this._filterColumnList = [];
    this._sortColumnList = [];
    this._selectedRowKeys = [];
    this._openRowKeys = [];
    this._isAllSelected = false;
    this._isOpenColumnChooser = false;
    this._currentStateName = "";
    this._pager = this.pagerService.getPager(0, 1, this.pageSize);
    if (this.isServerOperations) {
      this._getCurrentViewData(1);
    }
    else {
      this._resetDataSource();
      this._getCurrentViewData(1);
    }
  }

  /**
   * select all rows
   */
  selectAll() {
    this._selectAll()
  }

  /**
   * de select all rows
   */
  deSelectAll() {
    this._deSelectAll();
  }

  /**
   * hide column by index
   * @param idx index number of column
   */
  hideColumnByIndex(idx: number) {
    this._columns[idx].visible = false;
    this._setVisibleColumns();
  }

  /**
   * show column by index
   * @param idx index number of column
   */
  showColumnByIndex(idx: number) {
    this._columns[idx].visible = true;
    this._setVisibleColumns();
  }

  /**
   * hide column by data field
   * @param dataField dataField value of column
   */
  hideColumnByDataField(dataField: string) {
    for (let element of this._columns) {
      if (element.dataField === dataField) {
        element.visible = false;
      }
    }
    this._setVisibleColumns();
  }

  /**
   * show column by data field
   * @param dataField dataField value of column
   */
  showColumnByDataField(dataField: string) {
    for (let element of this._columns) {
      if (element.dataField === dataField) {
        element.visible = true;
      }
    }
    this._setVisibleColumns();
  }

  /**
   * go to page
   * @param pageNumber page number
   */
  goToPage(pageNumber: number) {
    this._getCurrentViewData(pageNumber);
  }

  /**
   * sort by column
   * @param dataField dataField value of column
   * @param direction desc | asc
   */
  sortByColumn(dataField: string, direction: SortDirections) {
    var sortColumn = this.utilityService.custFind(this._columns, function (element: Column) { return element.dataField === dataField });
    sortColumn.sortDirection = direction;
    this._onSort(sortColumn);
  }

  /**
   * filter by column 
   * @param dataField dataField value of column
   * @param keyword search keyword
   * @param type FilterTypes
   */
  filterByColumn(dataField: string, keyword: string, type: FilterTypes) {
    var filterColumn = this.utilityService.custFind(this._columns, function (element: Column) { return element.dataField === dataField });
    filterColumn.filterString = keyword;
    filterColumn.filterType = type;
    this._onFilter(filterColumn, true);
  }

  /**
   * get total row count
   */
  getTotalRows() {
    return this._pager.totalItems;
  }

  /**
   * get current page number
   */
  getCurrentPageNumber() {
    return this._pager.currentPage;
  }

  /**
   * get page size
   */
  getPageSize() {
    return this.pageSize;
  }

  /**
   * get total pages number
   */
  getTotalPages() {
    return this._pager.totalPages;
  }

  /**
   * close all childs
   */
  closeAllChild() {
    this._openRowKeys = [];
  }

  /**
   * get filter column list
   */
  getFilterColumns() {
    return this._filterColumnList;
  }

  /**
   * get sort column list
   */
  getSortColumns() {
    return this._sortColumnList;
  }

  /**
   * get column list
   */
  getColumns() {
    return this._getColumnsArray();
  }

  /**
   * set column list
   * @param columns 
   */
  setColumns(columns: Column[]) {
    this._columns = columns;
    var currentFilterColumnList = [];
    for (let element of this._columns) {
      if (element.filterOperator && element.filterValue && element.filterValue.toString().length > 0) {
        currentFilterColumnList.push({ dataField: element.dataField, filterOperator: element.filterOperator, filterValue: element.filterValue, dataType: element.dataType });
      }
    }
    this._filterColumnList = currentFilterColumnList;
    var currentSortColumnList = [];
    for (let element of this._columns) {
      if (element.sortEnable && element.sortDirection) {
        currentSortColumnList.push({ dataField: element.dataField, sortDirection: element.sortDirection });
      }
    }
    this._sortColumnList = currentSortColumnList;
    if (!this.isServerOperations) {
      this._filterDataSource();
      this._sortDataSource();
    }
    this._getCurrentViewData(1);
    this._setVisibleColumns();
    this, this._selectedRowKeys = [];
    this._openRowKeys = [];
  }

  _saveState() {
    var columns = this._getColumnsArray();
    var currentStateName = this._currentStateName;
    for (let element of this._stateList) {
      if (element.name === currentStateName) {
        element.columns = columns;
        this.editStateModal.open();
      }
    }
    if (this.onStatesUpdate) {
      this.onStatesUpdate.emit();
    }
  }

  _openModalToAddNewState() {
    this._stateName = "";
    this._nameAlreadyExistError = false;
    this.saveNewStateModal.open();
  }

  _closeModalToAddNewState() {
    this.saveNewStateModal.close();
  }

  _addState() {
    if (this._stateName && this._stateName.trim().length === 0) {
      return;
    }
    var name = this._stateName.trim();
    var state = this._stateList.filter(function (element: State) { if (element.name === name) { return element } });
    if (state && state.length > 0) {
      this._nameAlreadyExistError = true;
      return;
    } else {
      this._nameAlreadyExistError = false;
    }
    var columns = this._getColumnsArray();
    this._stateList.push(new State(name, columns));
    this._currentStateName = name;
    if (this.onStatesUpdate) {
      this.onStatesUpdate.emit();
    }
    this.saveNewStateModal.close();
  }

  _closeModalEditState() {
    this.editStateModal.close();
  }

  _closeModalDeleteState() {
    this.deleteStateModal.close();
  }

  _deleteState() {
    var currentStateName = this._currentStateName;

    var list = [];
    for (let element of this._stateList) {
      if (element.name != currentStateName) {
        list.push(element);
      }
    }
    this._stateList = list;

    if (this._stateList.length > 0) {
      this._currentStateName = this._stateList[0].name;
    } else {
      this._currentStateName = "";
    }
    this._loadState();
    if (this.onStatesUpdate) {
      this.onStatesUpdate.emit();
    }
    this.deleteStateModal.open();
  }

  _loadState() {
    var currentStateName = this._currentStateName;
    if (currentStateName === "") {
      this.reset();
      return;
    }
    var state = this._stateList.filter(function (element: State) { if (element.name === currentStateName) { return element } });
    if (state && state.length > 0) {
      this.setColumns(state[0].columns);
    }
  }

  private _getColumnsArray() {
    var result = [];
    for (let element of this._columns) {
      result.push(new Column(element));
    }
    return result;
  }

  /**
   * get state list
   */
  getAllState() {
    return this._stateList;
  }

  /**
   * set state list
   * @param states state array
   */
  setAllState(states: State[]) {
    this._stateList = states;
  }

  /**
   * refresh current view data only
   */
  refresh() {
    this._onRefresh();
  }

  _onRefresh() {
    this._getCurrentViewData(this._pager.currentPage);
  }

  _onResetColumns() {
    this.reset();
  }

  _resizeColumn($event: any, column: Column) {
    var currentWidth = column.width;
    if (isNaN(currentWidth)) {
      currentWidth = $event.source.element.nativeElement.parentElement.offsetWidth;
    }
    column.width = (isNaN(currentWidth) ? 0 : currentWidth) + $event.distance.x;
    $event.source.reset();
  }

  _exportToFile() {
    if (this.isServerExport) {
      var loadOpt = new LoadOptions();
      if (this.isODataOperations) {
        loadOpt.odataQuery = this.oDataService.buildQuery(0, 0, this._sortColumnList, this._filterColumnList, "allpages");
        loadOpt.isAllPages = true;
      } else {
        loadOpt.pageNumber = 1;
        loadOpt.pageSize = this._pager.totalItems;
        loadOpt.sortColumns = this._sortColumnList;
        loadOpt.filterColumns = this._filterColumnList;
        loadOpt.isAllPages = true;
      }
      this.onServerExport.emit(loadOpt);
      return;
    }
    if (this.isServerOperations) {
      var loadOpt = new LoadOptions();
      if (this.isODataOperations) {
        loadOpt.odataQuery = this.oDataService.buildQuery(0, 0, this._sortColumnList, this._filterColumnList, "allpages");
        loadOpt.isAllPages = true;
      } else {
        loadOpt.pageNumber = 1;
        loadOpt.pageSize = this._pager.totalItems;
        loadOpt.sortColumns = this._sortColumnList;
        loadOpt.filterColumns = this._filterColumnList;
        loadOpt.isAllPages = true;
      }
      this.onLoadData.emit(loadOpt);
    } else {
      this.fileService.downloadCSVFile(this._dataSource.data, this._visibleColumns);
    }
  }

  /**
   * Remove all sortings
   */
  removeAllSortings() {
    this._removeAllSorting();
    this._getCurrentViewData(1);
  }

  /**
   * Remove all filters
   */
  removeAllFilters() {
    this._removeAllFilters();
    this._getCurrentViewData(1);
  }

  _showAllColumns() {
    this._columns.forEach(function (element) {
      element.visible = true;
    });
    this._setVisibleColumns();
  }

  _clearColumnSearch() {
    this._searchColumnsKeyword = null;
  }

  _getCurrentPageStatistics() {
    return `per page / ${this._pager.startIndex >= 0 ? this._pager.startIndex + 1 : 0} - ${this._pager.endIndex + 1} of ${this._pager.totalItems}`;
  }
}