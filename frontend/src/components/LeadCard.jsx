// import { MapPin, Star, Phone, Mail, ExternalLink, Hash, Truck } from "lucide-react";

// const FULFILLMENT = {
//   FBA:     { cls: "bg-blue/10  text-blue  border-blue/20"  },
//   FBM:     { cls: "bg-amber/10 text-amber border-amber/20" },
//   Vendor:  { cls: "bg-green/10 text-green border-green/20" },
//   Unknown: { cls: "bg-muted/40 text-dim   border-border"   }
// };

// export default function LeadCard({ lead, index }) {

//   const f      = FULFILLMENT[lead.fulfillment] || FULFILLMENT.Unknown;
//   const rating = parseInt(lead.ratingPercentage) || null;

//   return (
//     <div
//       className="lead-card grid grid-cols-[2rem_1fr] gap-x-4 items-start
//                  bg-panel border border-border rounded-xl px-5 py-4
//                  hover:border-dim transition-colors duration-200"
//       style={{ animationDelay: `${Math.min(index * 35, 280)}ms` }}
//     >

//       {/* Index column */}
//       <div className="pt-0.5 text-[10px] font-mono text-dim tabular-nums text-right">
//         #{String(index + 1).padStart(3, "0")}
//       </div>

//       {/* Content column */}
//       <div className="min-w-0 flex flex-col gap-3">

//         {/* ── Row 1: name + badge ── */}
//         <div className="flex items-start justify-between gap-3">
//           <div className="min-w-0">
//             <h3 className="font-display font-semibold text-bright text-sm leading-snug truncate">
//               {lead.businessName || lead.sellerName || "Unknown"}
//             </h3>
//             {lead.businessName && lead.sellerName && lead.businessName !== lead.sellerName && (
//               <p className="text-[10px] font-mono text-dim mt-0.5 truncate">{lead.sellerName}</p>
//             )}
//           </div>
//           <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${f.cls}`}>
//             {lead.fulfillment || "?"}
//           </span>
//         </div>

//         {/* ── Row 2: inline data pills ── */}
//         <div className="flex flex-wrap gap-x-5 gap-y-2 text-[11px] font-mono">

//           {lead.address && (
//             <Pill icon={<MapPin size={10} />} label="Address">
//               <span className="text-text">{lead.address}</span>
//             </Pill>
//           )}

//           {lead.postcode && (
//             <Pill icon={<Hash size={10} />} label="Postcode">
//               <span className="text-bright font-semibold tracking-widest">{lead.postcode}</span>
//             </Pill>
//           )}

//           {lead.phoneNumber && (
//             <Pill icon={<Phone size={10} />} label="Phone">
//               <a href={`tel:${lead.phoneNumber}`} className="text-green hover:underline">
//                 {lead.phoneNumber}
//               </a>
//             </Pill>
//           )}

//           {lead.email && (
//             <Pill icon={<Mail size={10} />} label="Email">
//               <a href={`mailto:${lead.email}`} className="text-blue hover:underline">
//                 {lead.email}
//               </a>
//             </Pill>
//           )}

//           {rating !== null && (
//             <Pill icon={<Star size={10} />} label="Rating">
//               <div className="flex items-center gap-2">
//                 <div className="w-16 h-1 rounded-full bg-muted overflow-hidden">
//                   <div className="h-full rounded-full bg-green" style={{ width: `${rating}%` }} />
//                 </div>
//                 <span className="text-green font-semibold tabular-nums">{lead.ratingPercentage}</span>
//                 {lead.totalRatings && (
//                   <span className="text-dim">({lead.totalRatings})</span>
//                 )}
//               </div>
//             </Pill>
//           )}

//         </div>

//         {/* ── Row 3: links ── */}
//         <div className="flex gap-4 pt-2 border-t border-border">
//           {lead.sellerLink && (
//             <a
//               href={lead.sellerLink}
//               target="_blank"
//               rel="noopener noreferrer"
//               className="flex items-center gap-1 text-[10px] font-mono text-dim hover:text-green transition-colors"
//             >
//               <ExternalLink size={10} />
//               Seller Profile
//             </a>
//           )}
//           {lead.productUrl && (
//             <a
//               href={lead.productUrl}
//               target="_blank"
//               rel="noopener noreferrer"
//               className="flex items-center gap-1 text-[10px] font-mono text-dim hover:text-blue transition-colors"
//             >
//               <ExternalLink size={10} />
//               Product
//             </a>
//           )}
//         </div>

//       </div>

//     </div>
//   );
// }

// function Pill({ icon, label, children }) {
//   return (
//     <div className="flex flex-col gap-0.5">
//       <div className="flex items-center gap-1 text-[9px] font-mono text-dim uppercase tracking-wider">
//         {icon}
//         {label}
//       </div>
//       <div>{children}</div>
//     </div>
//   );
// }


import { MapPin, Star, Phone, Mail, ExternalLink, Hash, Truck, User, ShieldCheck } from "lucide-react";

const FULFILLMENT = {
  FBA: { cls: "bg-blue/10  text-blue  border-blue/20" },
  FBM: { cls: "bg-amber/10 text-amber border-amber/20" },
  Vendor: { cls: "bg-green/10 text-green border-green/20" },
  Unknown: { cls: "bg-muted/40 text-dim   border-border" }
};

export default function LeadCard({ lead, index }) {

  const f = FULFILLMENT[lead.fulfillment] || FULFILLMENT.Unknown;
  const rating = parseInt(lead.ratingPercentage) || null;

  return (
    <div
      className="lead-card grid grid-cols-[2rem_1fr] gap-x-4 items-start
                 bg-panel border border-border rounded-xl px-5 py-4
                 hover:border-dim transition-colors duration-200"
      style={{ animationDelay: `${Math.min(index * 35, 280)}ms` }}
    >

      {/* Index column */}
      <div className="pt-0.5 text-[10px] font-mono text-dim tabular-nums text-right">
        #{String(index + 1).padStart(3, "0")}
      </div>

      {/* Content column */}
      <div className="min-w-0 flex flex-col gap-3">

        {/* ── Row 1: name + badge ── */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-display font-semibold text-bright text-sm leading-snug truncate">
                {lead.businessName || lead.sellerName || "Unknown"}
              </h3>
              {lead.verifiedAt && (
                <ShieldCheck size={12} className="text-green shrink-0" title="Verified on Companies House" />
              )}
            </div>
            {lead.businessName && lead.sellerName && lead.businessName !== lead.sellerName && (
              <p className="text-[10px] font-mono text-dim mt-0.5 truncate">{lead.sellerName}</p>
            )}
            {lead.ownerName && (
              <div className="flex items-center gap-1 mt-0.5">
                <User size={9} className="text-blue shrink-0" />
                <p className="text-[10px] font-mono text-blue truncate">
                  {lead.ownerName}
                  {lead.ownerRole && <span className="text-dim ml-1">· {lead.ownerRole}</span>}
                </p>
              </div>
            )}
          </div>
          <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${f.cls}`}>
            {lead.fulfillment || "?"}
          </span>
        </div>

        {/* ── Row 2: inline data pills ── */}
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-[11px] font-mono">

          {lead.address && (
            <Pill icon={<MapPin size={10} />} label="Address">
              <span className="text-text">{lead.address}</span>
            </Pill>
          )}

          {lead.postcode && (
            <Pill icon={<Hash size={10} />} label="Postcode">
              <span className="text-bright font-semibold tracking-widest">{lead.postcode}</span>
            </Pill>
          )}

          {lead.phoneNumber && (
            <Pill icon={<Phone size={10} />} label="Phone">
              <a href={`tel:${lead.phoneNumber}`} className="text-green hover:underline">
                {lead.phoneNumber}
              </a>
            </Pill>
          )}

          {lead.email && (
            <Pill icon={<Mail size={10} />} label="Email">
              <a href={`mailto:${lead.email}`} className="text-blue hover:underline">
                {lead.email}
              </a>
            </Pill>
          )}

          {rating !== null && (
            <Pill icon={<Star size={10} />} label="Rating">
              <div className="flex items-center gap-2">
                <div className="w-16 h-1 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-green" style={{ width: `${rating}%` }} />
                </div>
                <span className="text-green font-semibold tabular-nums">{lead.ratingPercentage}</span>
                {lead.totalRatings && (
                  <span className="text-dim">({lead.totalRatings})</span>
                )}
              </div>
            </Pill>
          )}

        </div>

        {/* ── Row 3: links ── */}
        <div className="flex gap-4 pt-2 border-t border-border">
          {lead.sellerLink && (
            <a
              href={lead.sellerLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] font-mono text-dim hover:text-green transition-colors"
            >
              <ExternalLink size={10} />
              Seller Profile
            </a>
          )}
          {lead.productUrl && (
            <a
              href={lead.productUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] font-mono text-dim hover:text-blue transition-colors"
            >
              <ExternalLink size={10} />
              Product
            </a>
          )}
        </div>

      </div>

    </div>
  );
}

function Pill({ icon, label, children }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1 text-[9px] font-mono text-dim uppercase tracking-wider">
        {icon}
        {label}
      </div>
      <div>{children}</div>
    </div>
  );
}