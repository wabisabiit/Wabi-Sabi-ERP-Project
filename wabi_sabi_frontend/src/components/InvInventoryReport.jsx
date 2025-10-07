// src/components/InvInventoryReport.jsx
import React, { useState } from "react";
import "../styles/InventoryReports.css";
import {
  ExportMenu, PerPageSelect, Icon, MultiSelect, SimpleSelect, DateInput,
  LOCS, CATEGORIES, BRANDS
} from "./InvReportKit";

export default function InvInventoryReport() {
  const [showFilter, setShowFilter] = useState(true);
  const [perPage, setPerPage] = useState(10);
  const [query, setQuery] = useState("");

  const [from, setFrom] = useState("01/04/2025");
  const [to, setTo] = useState("31/03/2026");
  const [locs, setLocs] = useState([]);
  const [cat, setCat] = useState("");
  const [brand, setBrand] = useState("");

  const rows = [];
  const HEADERS = [
    "Item Code","Product","Brand","Category","Opening Qty","In Qty","Out Qty","Closing Qty","Location"
  ];

  return (
    <div className="rc-wrap">
      <div className="rc-head">
        <h3 className="rc-title">Inventory Report</h3>
        <span className="rc-home"><Icon.home/></span>
      </div>

      <div className="rc-card">
        <div className="rc-top rc-top--right">
          <div className="rc-right">
            <ExportMenu rows={rows} headers={HEADERS} filenameBase="inventory-report" />
            <PerPageSelect value={perPage} onChange={setPerPage} />
            <button className={`rc-filter ${showFilter ? "active" : ""}`} onClick={()=>setShowFilter(v=>!v)}>
              {Icon.filter()} <span>Filter</span>
            </button>
            <div className="rc-search rc-search--sm">
              <span className="rc-search-ic"><Icon.search/></span>
              <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search List..." />
            </div>
          </div>
        </div>

        {showFilter && (
          <div className="rc-filters">
            <div>
              <div className="rc-lb">From Date</div>
              <DateInput value={from} onChange={setFrom}/>
            </div>
            <div>
              <div className="rc-lb">To Date</div>
              <DateInput value={to} onChange={setTo}/>
            </div>
            <div>
              <div className="rc-lb">Category</div>
              <SimpleSelect placeholder="Select Category" options={CATEGORIES} value={cat} onChange={setCat} width={170}/>
            </div>
            <div>
              <div className="rc-lb">Brand</div>
              <SimpleSelect placeholder="Select Brand" options={BRANDS} value={brand} onChange={setBrand} width={170}/>
            </div>
            <div>
              <div className="rc-lb">Location</div>
              <MultiSelect placeholder="Select Location" options={LOCS} values={locs} onChange={setLocs} width={240}/>
            </div>
          </div>
        )}

        <div className="rc-table">
          <div className="rc-thead" style={{gridTemplateColumns:"48px 120px 1.6fr 120px 140px 110px 110px 110px 110px"}}>
            <div className="c id">#</div>
            <div className="c">Item Code</div>
            <div className="c">Product</div>
            <div className="c">Brand</div>
            <div className="c">Category</div>
            <div className="c">Opening Qty</div>
            <div className="c">In Qty</div>
            <div className="c">Out Qty</div>
            <div className="c">Closing Qty</div>
          </div>
        </div>
      </div>
    </div>
  );
}
