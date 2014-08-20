# RadiobuttonList

Radio button based input widget for enumeration values, boolean values and references. Useful replacement for the default drop-down or reference selector widget.

##Description

This widget enables you to render your attribute or association as a radiobutton list.

## Typical usage scenario

Visualize all possible options in your user interface, instead of forcing your user to open a dropdownlist to view all available options.

## Features and limitations
 
- Displaying the list in a horizontal or vertical direction.
- Specify text of the labels in case of a boolean attribute
- Attaching a microflow on the onchange event.

## Installation

Import the widget to your project and add either Radiobutton List or Radiobutton List Advance to a dataview on a page. Configure the properties to determine how the widget will behave in your application.

###Properties


##### General

Display        |
--------------------------------------------------------------------------------------------
*Direction*    | Determines if the radiobutton list will render horizontally or vertically

Events         |
--------------------------------------------------------------------------------------------
*On change*    | The microflow which will be invoked in case of a on change event.

##### Radiobutton list (based on an attribute)

Display        |
--------------------------------------------------------------------------------------------
*True label*   | Label which will be shown in case your 'Target source attribute' is a boolean type and attribute value is 'True'
*False label*  |  Label which will be shown in case your 'Target source attribute' is a boolean type and attribute value is 'False'

Target source |
--------------------------------------------------------------------------------------------
*Attribute*    | Attribute of type enumeration or boolean of which the values will be rendered as a radiobutton list.
 

##### Radiobutton list Advanced (based on an association)

Data source |
--------------------------------------------------------------------------------------------
*Entity to list* | Entity containing the attribute which should be rendered as a radiobutton list

*XPath constraint* | Constrain the list of objects to be retrieved

*Label* | (String) Attribute of which it's contents will be used as label

*Target reference* | Association where the reference will be saved.

*Sort attribute* | Attribute of which the value will determine the sort order

*Sort order* | Determines if values of the sort attribute will be sorted ascending or descending

###Example

Example for radiobutton list based on an association:
There are two entities defined, namely 'CompanyDepartment' and 'Employee'.
The application requires the option to refer an employee to a department.
In this case 'Employee' is the owner of an association between the two entities. (Employee_Companydepartment).

The configuration of the widget's required properties would be:
Entity to list: CompanyDepartment
Label: Name (String attribute of  CompanyDepartment)
Reference: Employee_CompanyDeparment/CompanyDepartment.

###Known bugs

Onchange has no effect on the form. Workaround: add a microflow to the onchange property of the widget.This microflow must contain a change activity. The change activity must have 'refresh in a client' enabled.

