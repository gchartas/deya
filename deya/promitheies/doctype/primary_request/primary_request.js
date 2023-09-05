// Copyright (c) 2023, EngLandGR LP and contributors
// For license information, please see license.txt

frappe.ui.form.on('Primary Request', {
    refresh: function(frm, cdt, cdn) {
        frm.fields_dict.material_request.get_query = function(doc) {
            return {
                filters: {
                    "status": "Pending"
                }
            };
        };
        calculate_totals(frm);
    },
    items_add: function(frm, cdt, cdn) {
        calculate_totals(frm);
    },
    items_remove: function(frm, cdt, cdn) {
        calculate_totals(frm);
    },
    pr_tmpl: function(frm) {
        update_subject_text(frm);
    },
    subject: function(frm) {
        update_subject_text(frm);
    },
    subtotal: function(frm){
        update_subject_text(frm);
    },
    material_request: function(frm) {
        if (frm.doc.material_request) {
            frappe.call({
                method: 'frappe.client.get',
                args: {
                    doctype: 'Material Request',
                    name: frm.doc.material_request
                },
                callback: function(r) {
                    if (r.message) {
                        const material_request_items = r.message.items;
                        
                        // Clear existing items in the 'items' child table of 'Primary Request'
                        frm.clear_table('items');
                        
                        // Copy items from 'Material Request' to 'Primary Request'
                        material_request_items.forEach(function(item) {
                            const d = frm.add_child('items');
                            d.item_code = item.item_code;
                            d.item_name = item.item_name;
                            d.description= item.description;
                            d.cpv = item.cpv;
                            d.expense_account = item.expense_account;
                            d.qty = item.qty;
                            d.uom = item.uom;
                            d.schedule_date = item.schedule_date;
                            d.rate = item.rate;
                            d.amount = item.amount;
                            d.conversion_factor = item.conversion_factor;
                            d.warehouse = item.warehouse;
                            // Add more fields if needed
                        });
                        
                        // Refresh the child table to reflect changes
                        frm.refresh_field('items');
                    }
                }
            });
        }
    }
});

function update_subject_text(frm) {
    if (frm.doc.pr_tmpl && frm.doc.subject) {
        frappe.call({
            method: 'frappe.client.get',
            args: {
                doctype: 'Primary Request Template',
                name: frm.doc.pr_tmpl
            },
            callback: function(r) {
                if (r.message) {
                    let template_subject = r.message.subject;
                    let rendered_subject = template_subject.replace("{{ subject }}", frm.doc.subject);
                    frm.set_value('subject_text', rendered_subject);
                    let template_text =r.message.text;
                    let rendered_text = template_text.replace("{{ subject }}", frm.doc.subject);
                    let formatted_subtotal = format_currency(frm.doc.subtotal);
                    rendered_text = rendered_text.replace("{{ subtotal }}", formatted_subtotal);
                    frm.set_value('text', rendered_text);
                }
            }
        });
    }
}

frappe.ui.form.on('Material Request Item', {
    rate: function(frm, cdt, cdn) {
        calculate_amount_for_row(frm, cdt, cdn);
        calculate_totals(frm);
    },
    qty: function(frm, cdt, cdn) {
        calculate_amount_for_row(frm, cdt, cdn);
        calculate_totals(frm);
    }
});
function calculate_amount_for_row(frm, cdt, cdn) {
    const row = locals[cdt][cdn];
    frappe.model.set_value(cdt, cdn, 'amount', row.rate * row.qty);
}
function calculate_totals(frm) {
    var subtotal = 0;
    $.each(frm.doc.items || [], function(i, d) {
        subtotal += flt(d.qty) * flt(d.rate);
    });
    
    // Setting the subtotal value
    frm.set_value("subtotal", subtotal);
    
    // Calculating VAT and setting the value
    var vatValue = flt(subtotal * 0.24);
    frm.set_value("vat", vatValue);
    
    // Calculating the total and setting the value
    var totalValue = flt(subtotal + vatValue);
    frm.set_value("total", totalValue);
    
    // Refresh fields to reflect changes
    frm.refresh_field("subtotal");
    frm.refresh_field("vat");
    frm.refresh_field("total");
}
