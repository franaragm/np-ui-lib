import { Component, TemplateRef, ViewChild, OnInit } from "@angular/core";
import { DataSource, DataTypes, Column, NpSidepanelComponent } from "np-ui-lib";
import { DataService } from "../data.service";
import { BehaviorSubject } from "rxjs";

@Component({
  selector: "app-client-grid-all",
  templateUrl: "./client-grid-all.component.html",
})
export class ClientGridAllComponent implements OnInit {
  gridColumns: any[];
  gridDataSource: BehaviorSubject<DataSource>;

  sidepanelData: any;

  @ViewChild("actionButtonsTemplate", { static: true })
  actionButtonsTemplate: TemplateRef<any>;
  @ViewChild("birthDateColumnTemplate", { static: true })
  birthDateColumnTemplate: TemplateRef<any>;
  @ViewChild("summaryTemplate", { static: true })
  summaryTemplate: TemplateRef<any>;
  @ViewChild("sidePanelRight", { static: true })
  sidePanelRight: NpSidepanelComponent;

  constructor(private dataService: DataService) {}

  ngOnInit() {
    this.gridColumns = [
      new Column({
        dataField: "Id",
        visible: true,
        width: 100,
        caption: "Id",
        dataType: DataTypes.Number,
        sortEnable: true,
        filterEnable: true,
        onCellClick: this.cellClicked,
      }),
      new Column({
        dataField: "FirstName",
        visible: true,
        width: 200,
        caption: "First Name",
        dataType: DataTypes.String,
        sortEnable: true,
        filterEnable: true,
      }),
      new Column({
        dataField: "LastName",
        visible: true,
        width: 200,
        caption: "Last Name",
        dataType: DataTypes.String,
      }),
      new Column({
        dataField: "BirthDate",
        visible: true,
        width: 200,
        caption: "Birth Date",
        dataType: DataTypes.Date,
        sortEnable: true,
        filterEnable: true,
        cellTemplate: this.birthDateColumnTemplate,
      }),
      new Column({
        dataField: "Age",
        visible: true,
        width: 200,
        dataType: DataTypes.Number,
        sortEnable: true,
        filterEnable: true,
        styleClass: "np-text-danger",
        rightAlignText: true,
      }),
      new Column({
        dataField: "Active",
        visible: true,
        width: 100,
        caption: "Is Active?",
        dataType: DataTypes.Boolean,
        filterEnable: true,
      }),
      new Column({
        caption: "Actions",
        visible: true,
        width: 200,
        cellTemplate: this.actionButtonsTemplate,
      }),
    ];

    this.gridDataSource = new BehaviorSubject(null);

    this.dataService.getAll().subscribe((data: any) => {
      // for client side data pass total is 0, as it will calculate total from length of array.
      const dataSource = new DataSource(data, 0, { totalCount: 10000 });
      this.gridDataSource.next(dataSource);
    });
  }

  cellClicked(event: any, column: any, row: any) {
    alert(
      "column " +
        column.dataField +
        " clicked. Value is " +
        row[column.dataField]
    );
  }

  onActionClick(rowData: any, event: any, $event) {
    $event.stopPropagation();
    if (event === "Edit") {
      this.sidepanelData = rowData;
      this.sidePanelRight.open(null);
    }
    if (event === "Delete") {
      alert("Delete button click for row: " + rowData.Id);
    }
  }
}
