# Copyright (c) 2023, EngLandGR LP and contributors
# For license information, please see license.txt

# import frappe
from frappe.model.document import Document


class PrimaryRequest(Document):
	pass

import frappe
from collections import defaultdict
from frappe import _

@frappe.whitelist()
def summarize_expense_accounts(doc, method):
    # Initialize a dictionary to hold the sum of items per expense account
    expense_account_summary = defaultdict(float)

    # Loop through each item in the Material Request Item child table
    for item in doc.items:
        account_name = item.expense_account
        # frappe.msgprint(_(account_name))
        
        # Fetch the account number based on the account name
        account_doc = frappe.get_doc("Account", account_name)
        account_number = account_doc.account_number if account_doc else "Unknown"
        # frappe.msgprint(_(account_number))

        amount = item.amount  # Replace with the actual field name for the amount
        expense_account_summary[account_number] += amount

    # Format the summary as a string with currency formatting
    summary_str = ', '.join(f"{account_number}: € {'{:.2f}'.format(total)}" for account_number, total in expense_account_summary.items())
    # frappe.msgprint(_(summary_str))

    # Update a field in Primary Request DocType with the summary
    doc.db_set("account_sum", summary_str)

from frappe.utils.file_manager import save_file
from frappe.utils.pdf import get_pdf
from frappe.utils.print_format import download_pdf

def save_as_pdf(doc, method):

    # Delete the existing attachment if it exists
    if doc.pdf_attachment:
        existing_file_url = doc.pdf_attachment
        existing_file = frappe.get_list("File", filters={"file_url": existing_file_url}, fields=["name"])
        if existing_file:
            frappe.delete_doc("File", existing_file[0].name)
            
    # Get HTML format of the document
    html = frappe.get_print(doc.doctype, doc.name, print_format="Primary Request")

    # Convert HTML to PDF
    pdf = get_pdf(html)

    # Create a filename
    filename = f'{doc.name.replace(" ", "-")}.pdf'

    # Save the file and link it to the document
    file = save_file(filename, pdf, "Primary Request", doc.name, is_private=1)

    # Attach the file to the `pdf_attachment` field and save the document
    doc.pdf_attachment = file.file_url
    doc.db_update()

    return "PDF generated and attached successfully."

