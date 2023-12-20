sap.ui.define(
  [
    "sap/ui/core/UIComponent",
    "sap/ui/core/format/NumberFormat",
    "sap/ui/Device",
    "ch/unige/fi/kofaxuimodule/model/models",
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/m/MessageBox"
   ],
  function (UIComponent, NumberFormat, Device, models, MessageToast, Filter, MessageBox) {
    "use strict";

    return UIComponent.extend("ch.unige.fi.kofaxuimodule.Component", {

      metadata: {
        manifest: "json"
      },
  
      /**
       * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
       * @public
       * @override
       */
      init: function () {
            // call the base component's init function
            UIComponent.prototype.init.apply(this, arguments);
  
              // enable routing
              this.getRouter().initialize();
  
               // Set Global Posting.json Model 
               sap.ui.getCore().setModel(this.getModel("Posting"), "Posting");

              
              // set the device model
              this.setModel(models.createDeviceModel(), "device");
               
              // 1. Get the Task Properties
              var startupParameters = this.getComponentData().startupParameters;
              var taskModel = startupParameters.taskModel;
              var taskData = taskModel.getData();
              var taskId = taskData.InstanceID;
  
              // 2. Read the Task Data
              var that = this;
              var contextModel = new sap.ui.model.json.JSONModel("/zunige_ui_kofax_approuter.chunigefikofaxuimodule/bpmworkflowruntime/v1/task-instances/" + taskId + "/context");
              var contextData = contextModel.getData();
  
              // 3. Update UI Context Model with Task Properties Data
            contextModel.attachRequestCompleted(function () {
                
                
                    contextData = contextModel.getData();
    
                    var processContext = {};
                    processContext.context = contextData;
                    processContext.context.task = {};
                    processContext.context.task.Title = taskData.TaskTitle;
                    processContext.context.task.Priority = taskData.Priority;
                    processContext.context.task.Status = taskData.Status;
                    processContext.context.task.taskId = taskData.InstanceID;
    
                    if (taskData.Priority === "HIGH") {
                        processContext.context.task.PriorityState = "Warning";
                    } else if (taskData.Priority === "VERY HIGH") {
                        processContext.context.task.PriorityState = "Error";
                    } else {
                        processContext.context.task.PriorityState = "Success";
                    }
    
                    processContext.context.task.CreatedOn = taskData.CreatedOn.toDateString();
                     
                    // https://help.sap.com/doc/72317aec52144df8bc04798fd232a585/Cloud/en-US/wfs-core-api-docu.html#api-UserTaskInstances-v1TaskInstancesGet
                    //processor: The user who is processing (has claimed) the user task instance. The user ID is at most 255 characters long.


                    // get task description and add it to the model
                    startupParameters.inboxAPI.getDescription("NA", taskData.InstanceID).done(function (dataDescr) {
                        processContext.context.task.Description = dataDescr.Description;
                        contextModel.setProperty("/task/Description", dataDescr.Description);
                    }).
                        fail(function (errorText) {});
    

                     that.LoadData(processContext.context);


                    contextModel.setData(processContext.context);
                    that.setModel(contextModel);
 

             //  });
  
                  // 4. Create Task Completion Buttons 
            
                //-> deactive reject button 
                //  var oNegativeAction = {
                //      sBtnTxt: "Rejeter Facture",
                //      onBtnPressed: function (e) {
                //          var viewModel = that.getModel();
                //          var contxt = viewModel.getData();
                //          that._completeTask(that.oComponentData.inboxHandle.attachmentHandle.detailModel.getData().InstanceID, "No") 
                //      }
                //  };
  

                 // Button =>>> "Envoyer pour Validation"
                if (!processContext.context.approved){ 
                   
                    var oPositiveAction = {
                        sBtnTxt: "Envoyer pour Validation",
                        onBtnPressed: function (e) {
                            var viewModel = that.getModel();
                            var contxt = viewModel.getData();


                                 // if possible to move to Step 2 only if we have at least 1 Item 
                                 // necessary to filter the Recipients Step 2 usinf the Center related to WBE
                              var All_with_wbe = true;

                             if(contxt.toItems.length != 0) {

                                  
                                    for (var j = 0; j < contxt.toItems.length; j++) {
                                        
                                        if (contxt.toItems[j].Wbselement === "") {
                                        
                                            All_with_wbe = false;

                                            break;
                                        }
    
                                    }



                                if (All_with_wbe == true){

  
                                  // Check if the ount = 1 ==> it's a defaul value that must be changed


                                        // Check if the ount = 1 ==> it's a defaul value that must be changed
                                        
                                        if (that._checkdefaultvalue(contxt) === true ){ 


                                            MessageBox.information(
                                                'Voulez-vous remplacer le montant initial de la facture?', {
                                                    id: "serviceErrorsMessageBoxconf",
                                                        
                                                    textAlignment: "Center",
                                
                                                    actions: [MessageBox.Action.OK, MessageBox.Action.NO],

                                                    onClose: function(sAction) {



                                                        if( sAction === MessageBox.Action.OK ) {

                                                            // replace the AMOUNT of the Invoice
                                                            that._changeamount(that.oComponentData.inboxHandle.attachmentHandle.detailModel.getData().InstanceID, contxt);

                                                            //=> Action 1 => Save (S) -> the Parked Document data 
                                                            that._save_parked_document(that.oComponentData.inboxHandle.attachmentHandle.detailModel.getData().InstanceID, contxt, "S", false);

                                                            } else {
                                                            //do nothing, just close the dialog ;)
                                                            }
                
                                                    }.bind(this)
                                                }
                                            );
                                        
                                    
                            

                                        } else {
                  

 
                                         ///////////////////

                                            // montant du poste par complet vs montant total
                                            if (that._checkmontant(contxt) === true ){ 

                                                //=> Action 1 => Save (S) -> the Parked Document data 
                                                that._save_parked_document(that.oComponentData.inboxHandle.attachmentHandle.detailModel.getData().InstanceID, contxt, "S", false);

                                                //=> Action 2 = Change the Context and finish the task 
                                                // Implemented in the callback Method --> see _save_parked_document()
                                                //that._completeTask(contxt, that.oComponentData.inboxHandle.attachmentHandle.detailModel.getData().InstanceID, "Yes")
                                            
                                                
                                                } else {
            
                                                    that._showServiceError("Le montant des postes ne correspond pas au montant total") ;
                        
                        
                                            }
    

                                        }


                                     
                                  } else {


                                      MessageToast.show("Vous devez entrer l'élément d'OTP");


                                }
                                                                     
                                 
                               





                            } else {   // onBtnPressed


                                MessageToast.show("Vous devez entrer un poste");


                             };


                        }
                    };


                    startupParameters.inboxAPI.addAction({
                        action: oPositiveAction.sBtnTxt,
                        label: oPositiveAction.sBtnTxt,
                        type: "Accept"
                    }, oPositiveAction.onBtnPressed);

                } ;


                // Button =>>> "Sauvegarder Facture"
                var oPositiveAction2 = {
                    sBtnTxt: "Sauvegarder Facture",
                    onBtnPressed: function (e) {
                        var viewModel = that.getModel();
                        var contxt = viewModel.getData();



                        // Check if the ount = 1 ==> it's a defaul value that must be changed
                        
                        if (that._checkdefaultvalue(contxt) === true ){ 




                            MessageBox.information(
                                'Voulez-vous remplacer le montant initial de la facture?', {
                                    id: "serviceErrorsMessageBoxconf",
                                         
                                    textAlignment: "Center",
                
                                    actions: [MessageBox.Action.OK, MessageBox.Action.NO],

                                    onClose: function(sAction) {



                                        if( sAction === MessageBox.Action.OK ) {

                                             // replace the AMOUNT of the Invoice
                                             that._changeamount(that.oComponentData.inboxHandle.attachmentHandle.detailModel.getData().InstanceID, contxt);

                                             // Action 1 => Save (S) - Save Parked Document
                                             that._save_parked_document(that.oComponentData.inboxHandle.attachmentHandle.detailModel.getData().InstanceID, contxt, "S", true);
                                            } else {
                                              //do nothing, just close the dialog ;)
                                            }
 
                                    }.bind(this)
                                }
                            );
                         
                    
            

                        } else {
     
                                // Action 1 => Save (S) - Save Parked Document
                                that._save_parked_document(that.oComponentData.inboxHandle.attachmentHandle.detailModel.getData().InstanceID, contxt, "S", true);
                        }


                    }
                };
 
                if (processContext.context.approved === "Yes"){ 
                 
                 
                    // Button =>>> "Comptabiliser"
                    var oPositiveAction3 = {
                        sBtnTxt: "Comptabiliser",
                        onBtnPressed: function (e) {
                            var viewModel = that.getModel();
                            var contxt = viewModel.getData();

                            // montant du poste par complet vs montant total
                           // if (that._checkmontant(contxt) === true ){ 
                            if (that._checkdefaultvalue(contxt) === true ){ 

 
                                MessageBox.information(
                                    'Voulez-vous remplacer le montant initial de la facture?', {
                                        id: "serviceErrorsMessageBoxconf",
                                             
                                        textAlignment: "Center",
                    
                                        actions: [MessageBox.Action.OK, MessageBox.Action.NO],
    
                                        onClose: function(sAction) {
    
    
    
                                            if( sAction === MessageBox.Action.OK ) {


                                            // replace the AMOUNT of the Invoice
                                            that._changeamount(that.oComponentData.inboxHandle.attachmentHandle.detailModel.getData().InstanceID, contxt);



                                             // Post data to Backend
                                             // Action 3 => Save (P) => Posting Parked Document
                                              that._save_parked_document(that.oComponentData.inboxHandle.attachmentHandle.detailModel.getData().InstanceID, contxt, "P", false);
                                          
                                                //=> Action 2 = Change the Context and finish the task 
                                                // Implemented in the callback Method --> see _save_parked_document()
                                                // that._completewf(contxt, that.oComponentData.inboxHandle.attachmentHandle.detailModel.getData().InstanceID, "Yes")
                                           } else {
                                                  //do nothing, just close the dialog ;)
                                            }
     
                                        }.bind(this)
                                    }
                                );
 
             
                           } else {


                               // Post data to Backend
                               // Action 3 => Save (P) => Posting Parked Document
                               that._save_parked_document(that.oComponentData.inboxHandle.attachmentHandle.detailModel.getData().InstanceID, contxt, "P", false);
                                          
                                //  that._showServiceError("Le montant des postes ne correspond pas au montant total") ;



                           }




                        }
                    };


                    startupParameters.inboxAPI.addAction({
                        action: oPositiveAction3.sBtnTxt,
                        label: oPositiveAction3.sBtnTxt,
                        type: "Accept"
                    }, oPositiveAction3.onBtnPressed);
    
 
                };
 
             

 



              startupParameters.inboxAPI.addAction({
                    action: oPositiveAction2.sBtnTxt,
                    label: oPositiveAction2.sBtnTxt,
                    type: "Accept"
                }, oPositiveAction2.onBtnPressed);




               /// Delete Button 


                var oNegativeAction = {
                    sBtnTxt: "Supprimer",
                    onBtnPressed: function (e) {

                        var viewModel = that.getModel();
                        var contxt = viewModel.getData();

                        

                        MessageBox.information(
                            'Voulez-vous supprimer la facture?', {
                                id: "serviceErrorsMessageBoxconf",
                                     
                                textAlignment: "Center",
            
                                actions: [MessageBox.Action.OK, MessageBox.Action.NO],

                                onClose: function(sAction) {



                                    if( sAction === MessageBox.Action.OK ) {

  
                                     // Post data to Backend to delete the parked document
                                
                                      that._save_parked_document(that.oComponentData.inboxHandle.attachmentHandle.detailModel.getData().InstanceID, contxt, "D", false);
                                  
                               
                                   } else {
                                          //do nothing, just close the dialog ;)


                                    }

                                }.bind(this)
                            }
                        );

 
             
                    }
                };


                //   Add the Delete Button task action buttons
        
                startupParameters.inboxAPI.addAction({
                    action: oNegativeAction.sBtnTxt,
                    label: oNegativeAction.sBtnTxt,
                    type: "Reject"
                }, oNegativeAction.onBtnPressed);
    
 
        
       

             }); //line 82 ... handle type of button 

         },  // close  init
          




              /**
              * check the amout contex !== tital amount of the items
              * @param {contxt} 
              * @return true/false        
              **/
                _checkdefaultvalue: function (contxt){
 
                    var oRegularizeLines =  contxt.toItems;
       
                    // calculate TOTAL
                    var sTotal = 0.00;
                    var sDivise = "";
                    var Charnumber = 0.00;

                    var oCurrencyFormat = NumberFormat.getCurrencyInstance({
                        currencyCode: false
                      });
    

                    for (var r = 0; r < oRegularizeLines.length; r++) {
                        Charnumber = oRegularizeLines[r].Montant;
                        var number = Number.parseFloat(Charnumber);

                        sTotal = sTotal + number;
                        sDivise = oRegularizeLines[r].Divise;
                        }

                        
                   var tot_format = oCurrencyFormat.format(sTotal, sDivise); // returns ¥1,235
                   var tot_format2 = oCurrencyFormat.format(contxt.demande_amount , sDivise); // returns ¥1,235


                    if (  tot_format  !==  tot_format2 ){

                        return true;

                    } else {  
                        return false;
                    }
               },

                    /**
                     * replace the Header Amount
                     * @param {contxt}   
                     * @return        
                     **/
               _changeamount: function (taskId, contxt){

                     var oRegularizeLines =  contxt.toItems;

                        // calculate TOTAL
                        var sTotal = 0.00;
                        var Divise = "";
                        var Charnumber = 0.00;
 


                        for (var r = 0; r < oRegularizeLines.length; r++) {

                            Charnumber = oRegularizeLines[r].Montant;
                            var number = Number.parseFloat(Charnumber);
                            

                             if( oRegularizeLines[r].Dcred === "0") {
                                sTotal = sTotal + number;
            
                              } else { //"Crédit",
                                sTotal = sTotal - number;
            
                              }

                              Divise = oRegularizeLines[r].Divise
                        }
                        contxt.demande_amount  =  sTotal ;
 

                      // Total de la Demande -> Defaul = valuer de la pièce + Total Items
                      var oTotal = sap.ui.getCore().getModel("Total");


                      var oCurrencyFormat = NumberFormat.getCurrencyInstance({
                        currencyCode: false
                       });
                      var tot_format = oCurrencyFormat.format(contxt.demande_amount, Divise); // returns ¥1,235

                        oTotal.setProperty("/Total_Reg",  tot_format );
                        oTotal.refresh();

 
                        var owf_context = this.getModel();

                        this._store_demande_amount(taskId, contxt.demande_amount);

                  

                        owf_context.refresh();

                },



                // 10. Store new demande_amount into workflow context
                /** _store_demande_amount
                *  
                * @param {taskIdn}
                * @param {contxt} 
                * @return {} 
                * @private
                * */
                 _store_demande_amount: function (taskId, demande_amount){

                    var that = this;
                
                    var token = this._fetchToken();

                // Step 1:
                // Retrieves the user task instance with the specified task instance ID. => we get the WF Instance ID
                //https://help.sap.com/doc/80205e0dc75945538b451284fdcc935b/Cloud/en-US/wfs-core-api-docu-cf.html#api-UserTaskInstances-v1TaskInstancesTaskInstanceIdGet
                ///v1/task-instances/{taskInstanceId}
              
                var Api_endpoint = "/zunige_ui_kofax_approuter.chunigefikofaxuimodule/bpmworkflowruntime/v1/task-instances/" +  taskId ;
       
                $.ajax({
                    url: Api_endpoint,
                    method: "GET",
                    contentType: "application/json",
                    async: true,
                     headers: {
                        "X-CSRF-Token": token
                    },
                    // @ts-ignore
                    success: function (result2, xhr2, data2) {
                  
                      debugger;

                        var RequestContent = {
                            demande_amount:  demande_amount 
                        };
                        
                        //result2.workflowInstanceId

                        // Step 2:
                        // Retrieves the user task instance with the specified task instance ID. => we get the WF Instance ID
                        //https://help.sap.com/doc/80205e0dc75945538b451284fdcc935b/Cloud/en-US/wfs-core-api-docu-cf.html#api-UserTaskInstances-v1TaskInstancesTaskInstanceIdGet
                        //v1/workflow-instances/{workflowInstanceId}/context

                        Api_endpoint = "/zunige_ui_kofax_approuter.chunigefikofaxuimodule/bpmworkflowruntime/v1/workflow-instances/" + result2.workflowInstanceId + "/context";

                        $.ajax({
                            url: Api_endpoint,
                            method: "PATCH",
                            contentType: "application/json",
                            data: JSON.stringify(RequestContent),
                            async: true,
                            headers: {
                                "X-CSRF-Token": token
                            },
                            // @ts-ignore
                            success: function (result2, xhr2, data2) {
                            //Status: 204 - The context has been updated.
                            debugger;

                            },

                            // @ts-ignore
                            error: function (err) {

                                MessageToast.show("Error submiting the request");
                            }
                        });
 
                    },

                    // @ts-ignore
                    error: function (err) {

                        MessageToast.show("Error submiting the request");
                    }

                });

            },



             /**
              * check  Total Amount 
              * @param {contxt} 
              * @return true/false        
              **/

            _checkmontant: function (contxt){

                  var oRegularizeLines =  contxt.toItems;

                     // calculate TOTAL
                    var sTotal = 0.00;
                    var sDivise = "";
                    var Charnumber = 0.00;


                    var oCurrencyFormat = NumberFormat.getCurrencyInstance({
                    currencyCode: false
                    });


                    for (var r = 0; r < oRegularizeLines.length; r++) {

                        Charnumber = oRegularizeLines[r].Montant;
                        var number = Number.parseFloat(Charnumber);

                        sTotal = sTotal + number;

                        sDivise = oRegularizeLines[r].Divise;

                    }
            
   
                  var tot_format = oCurrencyFormat.format(sTotal, sDivise); // returns ¥1,235
                  var tot_format2 = oCurrencyFormat.format(contxt.demande_amount, sDivise); // returns ¥1,235

                    if (  tot_format  ===  tot_format2 ){

                        return true;

                     } else {  
                        return false;
                     }
                },


 



             // 6  Adding Task Completion -- > L1
             _completeTask: function (contxt, taskId, approvalStatus) {
            
                var that = this;
                

                // get recipeints Layer 2
                var Array_CentreFin = this._get_Array_CentreFin(contxt.toItems) ;
                
                var oCentreFinFilters = this._getValidatorSet(Array_CentreFin);

                // var to = this._delete_lastuser_from_to(contxt.to, contxt.user_name);

    
                var oODataJSONModelUniqueID = new sap.ui.model.json.JSONModel();
                var su = "/zunige_ui_kofax_approuter.chunigefikofaxuimodule/sap/opu/odata/sap/Z_KOFAX_INVOICE_SRV/"  ;
                var oODataModel = new sap.ui.model.odata.ODataModel(su, true);

 
                 oODataModel.read("/ValidatorSet" ,{
                 filters: oCentreFinFilters,
                 success: 
                        function (oData, oResponse) {
                            //  set the odata JSON as data of JSON model
                            oODataJSONModelUniqueID.setData(oData);
                     
                            var oUniqueIDArray = JSON.parse(JSON.stringify(oODataJSONModelUniqueID.getData()));
                            var RecipientsL2_IDs = "";
 
                            for (var d = 0; d < oUniqueIDArray.results.length; d++) {
                             
                                 if (oUniqueIDArray.results.length > 1 && d == 0 ){
                                      RecipientsL2_IDs  =    oUniqueIDArray.results[d].UNIQUE_ID  ;
                                  } else if (oUniqueIDArray.results.length == 1 && d == 0 ){
                                    RecipientsL2_IDs  =    oUniqueIDArray.results[d].UNIQUE_ID;
                                  } else {
                                    RecipientsL2_IDs =  RecipientsL2_IDs + ','  + oUniqueIDArray.results[d].UNIQUE_ID;
                                 } 
                             }
                             

                             // delete from "to" recipeints the user who executed this task
                             var to = that._delete_lastuser_from_to(RecipientsL2_IDs, contxt.user_name);

                             // In case the recipient aren't defined I don't sent the task to Level 2

                            if( to !== "" ){

                                that._set_Complete_RecipientsL2(to,taskId,contxt,approvalStatus);

                            } else {

                                that._showServiceError("Aucune destinataire a été déterminé") ;

                            }
                        }
                     });

             }, // _completeTask:
  

            _set_Complete_RecipientsL2: function(RecipientsL2_IDs,taskId,contxt,approvalStatus) {

              var token = this._fetchToken();
              var that  = this;

              $.ajax({
                  url: "/zunige_ui_kofax_approuter.chunigefikofaxuimodule/bpmworkflowruntime/v1/task-instances/" + taskId,
                  method: "PATCH",
                  contentType: "application/json",
                  async: false,
                  data: "{\"status\": \"COMPLETED\", \"context\": {\"approved\":\"" + approvalStatus 
                  + "\" , \"usertask1\":\"" + contxt.user_name + "\" , \"to\":\"" + RecipientsL2_IDs + "\" , \"Chat\":\"" + contxt.Chat + "\"    }}",
                  headers: {
                      "X-CSRF-Token": token
                  },
                  // @ts-ignore
                  success: function (result2, xhr2, data2) {



                    that._showSuccessMessageSendL2(contxt, RecipientsL2_IDs);


                   // that._refreshTask(taskId);




                    },
                  // @ts-ignore
                  error: function (err) {
                    
                      MessageToast.show("Error submiting the request");
                    }
              });
             // this._refreshTask(taskId);
           },
  
            // 7. Supported Operations
           _fetchToken: function () {
              var token;
              $.ajax({
                  url: "/zunige_ui_kofax_approuter.chunigefikofaxuimodule/bpmworkflowruntime/v1/xsrf-token",
                  method: "GET",
                  async: false,
                  headers: {
                      "X-CSRF-Token": "Fetch"
                  },
                  success: function (result, xhr, data) {
                      token = data.getResponseHeader("X-CSRF-Token");
                  }
              });
              return token;
           },
  


            /**
            * refresh Inbox
            * @param {taskId} taskId

            * */ 
            _refreshTask: function (taskId) {
              this.getComponentData().startupParameters.inboxAPI.updateTask("NA", taskId);
            },


            // 8. Post data to Backend
            _save_parked_document: function (taskId, contxt, Action, only_save) {

              var that = this ;

              var JModel_Posting=   this._JModel_Load(sap.ui.getCore().getModel("Posting"), contxt, Action);
             
              var su =  this._getCPIRuntimeBaseURL() ; //"/zunige_ui_kofax_approuter.chunigefikofaxuimodule/sap/opu/odata/sap/Z_KOFAX_INVOICE_SRV/"  ;
              var oODataModel = new sap.ui.model.odata.ODataModel(su, true);
                
              sap.ui.core.BusyIndicator.show();

                oODataModel.create("/ParkDocHeaderSet", JModel_Posting.oData, {

                method:"POST",    

                success: function(oData, response) {
                    sap.ui.core.BusyIndicator.hide();
       
                    // response header
                    var hdrMessage = response.headers["sap-message"];
                    var hdrMessageObject = JSON.parse(hdrMessage);


                        //message: "La pièce ne peut pas être comptabilisée, car solde pièce différent de 0"
                        //severity : "error"

                        if(hdrMessageObject.severity === "error") {

                            that._showServiceError(hdrMessageObject.message);


                        } else { 
                            if(Action === 'S'){   // when i save the data
                               
                                 if (only_save){    // The Sauvgarger button has been pushed


                                    // fetch FILES URLs from Response
                                    that._fetchFiles(contxt, oData);

                                    // fetch Duedate from Response
                                    that._fetchDuedate(contxt, oData);

                                    let str_msg = "La facture Préenregistréé " + contxt.Belnr + " enregistré"

                                    MessageToast.show(str_msg );

                                     
                               
                                } else {   // Send the WI to Layer 2
                                
                                        // fetch center number from Response
                                        that._fetchCentre(contxt, oData);
                                        
                                        //coplete the task and send it to Layer 2
                                        that._completeTask(contxt, taskId, "Yes");
                                }
                            
                            } else if (Action === 'D') {   // Send the WI to Layer 2
                                //coplete the wf
                                that._completewf(contxt, taskId, "Yes");


                                let str_msg = "La facture Préenregistréé " + contxt.Belnr + " a été supprimée"

                                MessageToast.show(str_msg );



                            } else {   // when i've Posted the Document -->// Action === 'P'
                             
                                // Complete the User task L2 

                                that._showSuccessMessageSave(contxt.Belnr, contxt.Gjahr, contxt, taskId);
                               
            
                            }

                        }       
                },
                error: function (oData, response){
                    sap.ui.core.BusyIndicator.hide();
                  
                    that._showServiceError("Erreur à la sauvgarde");
 
                },
              



               });

               contxt.refresh;
               
               // this._refreshTask(taskId);
            },

                // 9. Setting WF Completion 
                _completewf: function (contxt, taskId, approvalStatus) {
                            
                    var oThisController = this;
                    var empty = "";

                    var token = this._fetchToken();
                    $.ajax({
                        url: "/zunige_ui_kofax_approuter.chunigefikofaxuimodule/bpmworkflowruntime/v1/task-instances/" + taskId,
                        method: "PATCH",
                        contentType: "application/json",
                        async: false,
                        data: "{\"status\": \"COMPLETED\", \"context\": {\"to\":\""  + empty + "\" , \"Chat\":\"" + contxt.Chat + "\"  }}",
                        headers: {
                            "X-CSRF-Token": token
                        },
                        // @ts-ignore
                        success: function (result2, xhr2, data2) {

                     
                          //   oThisController._refreshTask(taskId);

                        },
                        // @ts-ignore
                        error: function (err) {
                        
                            MessageToast.show("Error submiting the request");
                        }
                    });
                    this._refreshTask(taskId);
                },

            // 10. Store Chat string into the workflow context
            /** _store_chat
            *  
            * @param {taskIdn}
            * @param {contxt} 
            * @return {} 
            * @private
            * */
            _store_chat: function (taskId, contxt){

                var that = this;
            
                var token = this._fetchToken();

                // Step 1:
                // Retrieves the user task instance with the specified task instance ID. => we get the WF Instance ID
                //https://help.sap.com/doc/80205e0dc75945538b451284fdcc935b/Cloud/en-US/wfs-core-api-docu-cf.html#api-UserTaskInstances-v1TaskInstancesTaskInstanceIdGet
                ///v1/task-instances/{taskInstanceId}
              
                var Api_endpoint = "/zunige_ui_kofax_approuter.chunigefikofaxuimodule/bpmworkflowruntime/v1/task-instances/" +  taskId ;
       
                $.ajax({
                    url: Api_endpoint,
                    method: "GET",
                    contentType: "application/json",
                    async: true,
                     headers: {
                        "X-CSRF-Token": token
                    },
                    // @ts-ignore
                    success: function (result2, xhr2, data2) {
                  
                      debugger;

                        var RequestContent = {
                            Chat: contxt.Chat
                        };
                        
                        //result2.workflowInstanceId

                        // Step 2:
                        // Retrieves the user task instance with the specified task instance ID. => we get the WF Instance ID
                        //https://help.sap.com/doc/80205e0dc75945538b451284fdcc935b/Cloud/en-US/wfs-core-api-docu-cf.html#api-UserTaskInstances-v1TaskInstancesTaskInstanceIdGet
                        //v1/workflow-instances/{workflowInstanceId}/context

                        Api_endpoint = "/zunige_ui_kofax_approuter.chunigefikofaxuimodule/bpmworkflowruntime/v1/workflow-instances/" + result2.workflowInstanceId + "/context";

                        $.ajax({
                            url: Api_endpoint,
                            method: "PATCH",
                            contentType: "application/json",
                            data: JSON.stringify(RequestContent),
                            async: true,
                            headers: {
                                "X-CSRF-Token": token
                            },
                            // @ts-ignore
                            success: function (result2, xhr2, data2) {
                            //Status: 204 - The context has been updated.
                            debugger;

                            },

                            // @ts-ignore
                            error: function (err) {

                                MessageToast.show("Error submiting the request");
                            }
                        });
 
                    },

                    // @ts-ignore
                    error: function (err) {

                        MessageToast.show("Error submiting the request");
                    }

                });

            },


            // 11. get data from Backend
            /**  get data from Backend
            *  
            * @param {contxt} 
            * @return {} 
            * @private
            * */

            LoadData: function (context) {
             //   context.Ausbk 
             //   context.Belnr            
             //   context.Bukrs
             //   context.Gjahr

                 var that = this;
            
                 // get the BTP User ID 
                 $.ajax({
                    method: "GET",
                    url: "/zunige_ui_kofax_approuter.chunigefikofaxuimodule/user-api/currentUser",
                    async: false,
                      success: function (result, xhr, data) {
                        that._user_name = data.responseJSON.name;
                   
                        context.user_name = {};
                        context.user_name  =  that._user_name ;


                      },
                      error: function (error) {
                        MessageToast.show("Error extraction de l'utilisateur");
                      }
                    
                  });



                  
                 // get the Backend Data
                 var key_query = '(Ausbk=' +  "'" + context.Ausbk +  "'"  + ',Bukrs=' +  "'"  
                 + context.Bukrs  + "'"  + ',Belnr=' +  "'"  + context.Belnr +  "'"  + ',Gjahr=' +  "'"  +  context.Gjahr  +  "'"  + ")";
                 
                 
                    // HEADER PARKET DOCUMENT AJAX
                    //(Ausbk='1000',Bukrs='1000',Belnr='1900000175',Gjahr='2023') -> Example
                     var key_query2 = key_query  + '?$format=json' ;
   
         
                     $.ajax({
                       url: "/zunige_ui_kofax_approuter.chunigefikofaxuimodule/sap/opu/odata/sap/Z_KOFAX_INVOICE_SRV/ParkDocHeaderSet"+ key_query2,
                       method: "GET",
                       cache: false,
                       async: false,
                       success: function (result, xhr, data) {
   
   
                           var oParkedinvoiceH = data.responseJSON.d;
 
                           context.customer_name = {};
                           context.customer_name = oParkedinvoiceH.Name;
 
                           context.ParkedinvoiceH = {};

 
                           // Bldat : "/Date(1698105600000)/"  - JSON Date Object - milliseconds
                           // Budat : "/Date(1698105600000)/"  - JSON Date Object - milliseconds
 

                           var Bldat_str = oParkedinvoiceH.Bldat.replace('/Date(','');
                               Bldat_str = Bldat_str.replace(')/','');
                           var Bldat = new Date(0); // Unix EPOCH time
                               Bldat.setUTCMilliseconds(Bldat_str);


                          var Budat_str = oParkedinvoiceH.Budat.replace('/Date(','');
                              Budat_str = Budat_str.replace(')/','');
                          var Budat = new Date(0); // Unix EPOCH time
                              Budat.setUTCMilliseconds(Budat_str);
   
  
                              context.ParkedinvoiceH = oParkedinvoiceH;
          
                              context.ParkedinvoiceH.Bldat = Bldat.toLocaleDateString(); // "12/07/2023"    UI5    Short Date
                              context.ParkedinvoiceH.Bldat = context.ParkedinvoiceH.Bldat.replaceAll('/','-');  // "12-07-2023"    UI5   Picker Format date

                              context.ParkedinvoiceH.Budat = Budat.toLocaleDateString(); // "12/07/2023"    UI5    Short Date
                              context.ParkedinvoiceH.Budat = context.ParkedinvoiceH.Budat.replaceAll('/','-'); // "12-07-2023"    UI5   Picker Format date
                         
                               // data Picker 
                               // displayFormat="dd-MM-yyyy" valueFormat="yyyy-MM-dd"
                               // Istore in the context  valueFormat="yyyy-MM-dd"
                              context.ParkedinvoiceH.Bldat    = that._format_date_from_DatePicker(context.ParkedinvoiceH.Bldat);
                              context.ParkedinvoiceH.Budat    = that._format_date_from_DatePicker(context.ParkedinvoiceH.Budat);
                            

                              // Only form Ms EDGE

                              if(context.ParkedinvoiceH.Bldat.includes('undefined-undefined-')){
                                const myArray1 = context.ParkedinvoiceH.Bldat.split("undefined-undefined-");
                                context.ParkedinvoiceH.Bldat = that._invert_date(myArray1[1]); // dd.mm.yyyy to yyyy-mm-dd
                              }

                              if(context.ParkedinvoiceH.Budat.includes('undefined-undefined-')){
                                const myArray2 = context.ParkedinvoiceH.Budat.split("undefined-undefined-");
                                context.ParkedinvoiceH.Budat = that._invert_date(myArray2[1]); // dd.mm.yyyy to yyyy-mm-dd
                              }
 

                              if (oParkedinvoiceH.Duedate) {
                                debugger;
  
                                var Duedate_str = oParkedinvoiceH.Duedate.replace('/Date(','');
                                Duedate_str = Duedate_str.replace(')/','');
                                var Duedate = new Date(0); // Unix EPOCH time
                                Duedate.setUTCMilliseconds(Duedate_str);
  
                                context.ParkedinvoiceH.Duedate = Duedate.toLocaleDateString(); // "12/07/2023"    UI5    Short Date
                                context.ParkedinvoiceH.Duedate = context.ParkedinvoiceH.Duedate.replaceAll('/','-'); // "12-07-2023"    UI5   Picker Format date
                                context.ParkedinvoiceH.Duedate  = that._format_date_from_DatePicker(context.ParkedinvoiceH.Duedate );
   
                                // Only form Ms EDGE
                                if(context.ParkedinvoiceH.Duedate.includes('undefined-undefined-')){
                                    const myArray3 = context.ParkedinvoiceH.Duedate.split("undefined-undefined-");
                                    context.ParkedinvoiceH.Duedate = that._invert_date(myArray3[1]); // dd.mm.yyyy to yyyy-mm-dd
                                }
 
                              } else {  // Duedate is empty string 
                                 
                                  debugger;
                                
                              }

 
                             // Get  Bank if exists
 
                              if(context.ParkedinvoiceH.Vendor !== '') {
 
                               var vend_filter = 'BankSet?$filter=Partner eq' + "'"  + context.ParkedinvoiceH.Vendor  + "'" + '&$format=json';
                
                                $.ajax({
                                    url: "/zunige_ui_kofax_approuter.chunigefikofaxuimodule/sap/opu/odata/sap/Z_KOFAX_INVOICE_SRV/" + vend_filter ,
                                    method: "GET",
                                    cache: false,
                                    async: false,
                                    success: function (result, xhr, data) {

                                        // check if i get some entries 
                                        if(result.d.results.length > 0){ 

                                             var oBankVendor = result.d.results;   // get the array                                  
                                     
                                             //context.BankVendor = oBankVendor[0];
                                  
                                             context.ArrayBankVendor = [];
                                          
                                            var JBanque = 
                                            '{"Counter": "0000", "Bankaccount": "","Bankcountry": "","Bankkey": "", "Iban": "","Swift": "", "Text": "" }';

                                               var obj_JBanque = JSON.parse(JBanque); //to convert the string into a JavaScript object
                                           
                                               context.ArrayBankVendor.push(obj_JBanque);  


                                            // dans la pièce il y a la Banque du payment 
                                           // if(context.ParkedinvoiceH.Bankcounter !== ''){

                                          
                                                for (var d = 0; d < result.d.results.length; d++) {
             
                                                   if(context.ParkedinvoiceH.Bankcounter ===
                                                     result.d.results[d].Counter ){

                                                        context.BankVendor = result.d.results[d];
                                                     }
                                                     var oJBanque = JSON.parse(JBanque);
                                                     oJBanque.Counter =  result.d.results[d].Counter ;
                                                     oJBanque.Bankaccount =  result.d.results[d].Bankaccount ;
                                                     oJBanque.Bankcountry =  result.d.results[d].Bankcountry ;
                                                     oJBanque.Bankkey =  result.d.results[d].Bankkey  ;
                                                     oJBanque.Iban  =  result.d.results[d].Iban  ;
                                                     oJBanque.Swift  =  result.d.results[d].Swift ;
                                                     oJBanque.Text =  result.d.results[d].Text ;

                                                     context.ArrayBankVendor.push(oJBanque);

                                              
                                                }



                                          //  } else {



                                                
                                         //  }

                                        } else { // check if i get some entries 




                                        } // check if i get some entries 

                                    },

                                    // @ts-ignore
                                    error: function (err) {
                                    MessageToast.show("Error submiting Bank Update request");
                                    }
                                
                                });
                

                              }

 
                             // GET THE FILES PARKET DOCUMENT AJAX
                             var key_query3 =  key_query +   "/toFiles?$format=json" ;
   
                             $.ajax({
                                     url: "/zunige_ui_kofax_approuter.chunigefikofaxuimodule/sap/opu/odata/sap/Z_KOFAX_INVOICE_SRV/ParkDocHeaderSet"+key_query3,
                                     method: "GET",
                                     cache: false,
                                     async: false,
                                     success: function (result, xhr, data) {
                                         var oParkedinvoiceFiles = result.d.results;        
                                        
                                         
                                         context.toFiles = [];
                                         context.toFiles = oParkedinvoiceFiles;
   
                                          that._setRouterPrefix_in_Files(context.toFiles);
   
        
                                         },
   
                                         // @ts-ignore
                                         error: function (err) {
                                           MessageToast.show("FILES: Error submiting the request");
                                          }
                                      
                               });
   
 
                               // GET the ITEMS PARKET DOCUMENT AJAX
                               var key_query4 = key_query + '/toItems?$format=json' ;
   
                               $.ajax({
                                   url: "/zunige_ui_kofax_approuter.chunigefikofaxuimodule/sap/opu/odata/sap/Z_KOFAX_INVOICE_SRV/ParkDocHeaderSet"+key_query4,
                                   method: "GET",
                                   cache: false,
                                   async: false,
                                   success: function (result, xhr, data) {
   
                                       var oParkedinvoiceItems = result.d.results;                                     
                                    
                                       
                                       context.toItems = [];
                                       context.toItems = oParkedinvoiceItems;
                                       
                                       // set enabled=false for the Currency CBOX
                                       context.cboxdevise = false ;

                                     },
   
                                    // @ts-ignore
                                    error: function (err) {
                                      MessageToast.show("ITEMS: Error submiting the request");
                                     }
                                  
                               });
                           

                               // get Currencies
     
                               $.ajax({
                                   url: "/zunige_ui_kofax_approuter.chunigefikofaxuimodule/sap/opu/odata/sap/Z_KOFAX_INVOICE_SRV/CurrencyDescriptionSet?$format=json",
                                   method: "GET",
                                   cache: false,
                                   async: false,
                                   success: function (result, xhr, data) {
   
                                       var oCurrencies = result.d.results;                                     
                                    
                                       
                                       context.Currencies = [];
                                       context.Currencies = oCurrencies;
   

                                     },
   
                                    // @ts-ignore
                                    error: function (err) {
                                      MessageToast.show("Currencies: Error submiting the request");
                                     }
                                  
                                });
                           

                               // get TVA
     
                               $.ajax({
                                url: "/zunige_ui_kofax_approuter.chunigefikofaxuimodule/sap/opu/odata/sap/Z_KOFAX_INVOICE_SRV/TaxSet?$format=json",
                                method: "GET",
                                cache: false,
                                async: false,
                                success: function (result, xhr, data) {

                                    var oTva = result.d.results;                                     
                                
                                    
                                    context.Tva = [];
                                    context.Tva = oTva ;


                                  },

                                 // @ts-ignore
                                 error: function (err) {
                                   MessageToast.show("TVA: Error submiting the request");
                                  }
                               
                             });
                        


                             //PaymentCondition

                             $.ajax({
                                url: "/zunige_ui_kofax_approuter.chunigefikofaxuimodule/sap/opu/odata/sap/Z_KOFAX_INVOICE_SRV/PaymentConditionSet?$format=json",
                                method: "GET",
                                cache: false,
                                async: false,
                                success: function (result, xhr, data) {

                                    var oPaymentCondition = result.d.results;                                     
                                
                                    
                                    context.PaymentCondition = [];
                                    context.PaymentCondition = oPaymentCondition ;


                                  },

                                 // @ts-ignore
                                 error: function (err) {
                                    MessageToast.show("PaymentCondition: Error submiting the request");
                                  }
                               
                             });




                            // PaymentMethod


                             $.ajax({
                                url: "/zunige_ui_kofax_approuter.chunigefikofaxuimodule/sap/opu/odata/sap/Z_KOFAX_INVOICE_SRV/PaymentMethodSet?$format=json",
                                method: "GET",
                                cache: false,
                                async: false,
                                success: function (result, xhr, data) {

                                    var oPaymentMethod= result.d.results;                                     
                                
                                    
                                    context.PaymentMethod = [];
                                    context.PaymentMethod = oPaymentMethod ;


                                  },

                                 // @ts-ignore
                                 error: function (err) {
                                   MessageToast.show("PaymentMethod: Error submiting the request");
                                  }
                               
                             });

                             
                              // TaxSet

                              $.ajax({
                                url: "/zunige_ui_kofax_approuter.chunigefikofaxuimodule/sap/opu/odata/sap/Z_KOFAX_INVOICE_SRV/TaxSet?$format=json",
                                method: "GET",
                                cache: false,
                                async: false,
                                success: function (result, xhr, data) {

                                    var oTax= result.d.results;                                     
                                
                                    
                                    context.Tax = [];
                                    context.Tax = oTax ;

                                  },

                                 // @ts-ignore
                                 error: function (err) {
                                   MessageToast.show("TaxSet: Error submiting the request");
                                  }

                                });

                              // Add Debit credit
                              //   text="Débit" key="0" 
                              //   text="Crédit" key="1" 


                             context.Debitcredit =
                              [
                                 {
                                  "key": "0",
                                  "text": "Débit",
                                 },
                                {
                                  "key": "1",
                                  "text": "Crédit",
                                  } 
                              ];
 
 

                        } //HEADER PARKET DOCUMENT AJAX - Success
   

                     });
   


            },


                /**
                  * Save Files into Posting.json
                  * @param {object} [] oFiles  
                  * @public
                **/
              
                _setRouterPrefix_in_Files: function (oFiles) {

                    // add APP Router Prefix
    
                    for (var j = 0; j < oFiles.length; j++) {
                      var oAttachmentURL =  "/zunige_ui_kofax_approuter.chunigefikofaxuimodule" + oFiles[j].Url;
                      oFiles[j].Url = oAttachmentURL;
                  
                    }
        
                  },

 

                  /**
                  * Error POPUP
                  * @param {responseText}  
                  * @public
                  **/
                _showServiceError: function(responseText) {

                    MessageBox.information(
                        responseText, {
        
                            id: "serviceErrorsMessageBoxCR",
                          //  title: "Erreur",
                            
                            textAlignment: "Center",
        
                            actions: [sap.m.MessageBox.Action.OK],
                            onClose: function() {
                       
                            }.bind(this)
                        }
                    );
        
                },

                /**
                  * _showSuccessMessageSave
                  * Generic Confirmation Dialog for reuse
                   * @param  oRegularisationResponse
                  * */
                _showSuccessMessageSave: function (NewDocumentnumber, NewGjahr, contxt, taskId) {
                        
                   var  that = this;

                    MessageBox.confirm(
                        'La facture: ' + NewDocumentnumber  + ' ' + NewGjahr + ' a été créée!' , {
                            
                        title: "Creation Facture",

                        actions: [sap.m.MessageBox.Action.OK],
              
                        onClose: function (sAction) {
                            if (sAction === sap.m.MessageBox.Action.OK) {
                           
                                that._completewf(contxt, taskId, "Yes");
                            } 
                    
                        }.bind(this)
                    }
                    );

                    return false;
                },


                /**
                  * _showSuccessMessageSentL2
                  * Generic Confirmation Dialog for reuse
                   * @param  Documentnumber 
                   * @param  Gjahr
                   * @param  contxt
                  * */
                _showSuccessMessageSendL2: function (contxt, to) {
                        
                    var  that = this;
 
                     MessageBox.confirm(
                         'La facture: ' + contxt.Belnr + ' a été envoyée à ' + to + " pour être comptabilisée", {
                             
                         title: "Creation Facture",
 
                         actions: [sap.m.MessageBox.Action.OK],
               
                         onClose: function (sAction) {
                             if (sAction === sap.m.MessageBox.Action.OK) {
                            
                                that._refreshTask(that.oComponentData.inboxHandle.attachmentHandle.detailModel.getData().InstanceID);
                             } 
                     
                         }.bind(this)
                     }
                     );
 
                     return false;
                 },

             /**
            * get Runtime base URL
            * @param {}  
            * @return {url}  
            * @public
             **/


            _getCPIRuntimeBaseURL: function () {
                var appId = "ch.unige.fi.kofaxuimodule";
                var appPath = appId.replaceAll(".", "/");
                var appModulePath = jQuery.sap.getModulePath(appPath);

                return appModulePath + "/sap/opu/odata/sap/Z_KOFAX_INVOICE_SRV" ;
    
            },

            /**
            * Prepare JSON for posting to backend
            * @param {oPostingModel}  
            * @param {contxt} 
            * @param {Action} 
            * @return {oPostingModel}  
            * @public
             **/
            _JModel_Load: function (oPostingModel, contxt, Action) {
 
                oPostingModel.setProperty("/Ausbk",   contxt.Ausbk);
                oPostingModel.setProperty("/Bukrs",   contxt.Bukrs);
                oPostingModel.setProperty("/Belnr",   contxt.Belnr);
                oPostingModel.setProperty("/Gjahr",   contxt.Gjahr);

                oPostingModel.setProperty("/Action",  Action);

  
                    oPostingModel.setProperty("/Name",    contxt.ParkedinvoiceH.Name);
                    oPostingModel.setProperty("/Vendor",  contxt.ParkedinvoiceH.Vendor);
                    oPostingModel.setProperty("/Street",  contxt.ParkedinvoiceH.Street);
                    oPostingModel.setProperty("/City",    contxt.ParkedinvoiceH.City);
                    oPostingModel.setProperty("/Country", contxt.ParkedinvoiceH.Country);

                     oPostingModel.setProperty("/Paymentconditioncode", contxt.ParkedinvoiceH.Paymentconditioncode);
                     oPostingModel.setProperty("/Paymentmethodcode", contxt.ParkedinvoiceH.Paymentmethodcode);
                     oPostingModel.setProperty("/QrRef", contxt.ParkedinvoiceH.QrRef);
                     oPostingModel.setProperty("/Qriban", contxt.ParkedinvoiceH.Qriban);
 
                     oPostingModel.setProperty("/Calctva", contxt.ParkedinvoiceH.Calctva);

                     oPostingModel.setProperty("/Bktxt", contxt.ParkedinvoiceH.Bktxt);
                     oPostingModel.setProperty("/Xblnr", contxt.ParkedinvoiceH.Xblnr);
             
                     oPostingModel.setProperty("/Blart", contxt.ParkedinvoiceH.Blart);
                     oPostingModel.setProperty("/Divise", contxt.ParkedinvoiceH.Divise);


                     if  (contxt.ParkedinvoiceH.Bankcounter === '0000') {

                        oPostingModel.setProperty("/Bankcounter", '');
                     } else { 
                       oPostingModel.setProperty("/Bankcounter", contxt.ParkedinvoiceH.Bankcounter);
                    } 

                    // Date ---> 12-07-2023 date format from date Picker on UI5 Page
                    // Date ---> 2023-07-12T00:00:00 date format to ODATA Post

                    var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({
                        pattern: "yyyy-MM-dd"
                     });

                    
                     // date Bldat formatted for Posting to Backend 
                     var oDateBldat = contxt.ParkedinvoiceH.Bldat + "T00:00:00";
                     oPostingModel.setProperty("/Bldat", oDateBldat );

                    // date Budat formatted for Posting to Backend 
                    var  oDateBudat =contxt.ParkedinvoiceH.Budat + "T00:00:00";
                    oPostingModel.setProperty("/Budat",  oDateBudat);
                            
         
 
        
               //  "toFiles": []
                if (contxt.toFiles.length > 0) {
        
                    oPostingModel.oData.toFiles = [];

                    for (var d = 0; d < contxt.toFiles.length; d++) {
             
                        oPostingModel.oData.toFiles.push(contxt.toFiles[d]);
                    }
                } else {

                    delete  oPostingModel.toFiles;

                };

               //  "toItems": []
               if (contxt.toItems.length > 0) {
        
                oPostingModel.oData.toItems = [];

                for (var d = 0; d < contxt.toItems.length; d++) {
                  
                    if( contxt.toItems[d].__metadata !== undefined ){
                        delete contxt.toItems[d].__metadata;
                    }
     
                    oPostingModel.oData.toItems.push(contxt.toItems[d]);
                }
                } else {
                    oPostingModel.oData.toItems = [];
                    //delete  oPostingModel.toItems;

                };

             return oPostingModel;

            },

             /**
             * Format Date from UI5 Date DatePicker in format "2023-06-01"
             * @param {date} in date   "01-06-2023"
             * @return {date} out date  "2023-06-01"
             * @private
             * */

            _format_date_from_DatePicker: function (date) {
     

                const myArray = date.split("-");

                 var  dd  =  myArray[0]; 
                 var  mm  =  myArray[1];
                 var  yyyy = myArray[2];    

                date = yyyy + '-' + mm + '-' + dd ;


             return date;
            },

            /**
             * gat Array_CentreFin from the CTR of the Parked Document
             * @param {to} String with all the recipeint
             * @return {Array_CentreFin}  ARRAY
             * @private
             * */

            _get_Array_CentreFin: function (Items) {
             
              let Array_CentreFin = [];
         

              for (var d = 0; d < Items.length; d++) {
                Array_CentreFin.push(Items[d].Centre );    
             }
 

            return  Array_CentreFin;


            },
  
 
            /** _getFilterValidators
            *  
            * @param {Array_CentreFin} ARRAY
            * @return {aFilters} 
            * @private
            * */

            _getValidatorSet: function (Array_CentreFin) {
            
            
                var aFilters = [];

                for (var d = 0; d < Array_CentreFin.length; d++) {
                    aFilters.push(new Filter("OBJECT", sap.ui.model.FilterOperator.EQ, Array_CentreFin[d] ));
                }


            return aFilters;
            
            },

            /**
            * Delete user from to
            * @param {to} String with all the recipeint
            * @param {user} user to delete from to
            * @return {to} 
            * @private
            * */

            _delete_lastuser_from_to: function (to, user) {
                    let str = "" ;
            
                    let position =  to.search(user);
                    
                    if(position > 0 ){

                        str = ',' + user
                        to = to.replace(str,'');
        
                    } else {

                        str =  user +  ',' ;
                        to = to.replace(str,'');
                    }
                    //First
                
                return to;
            },



            /**
            * Get FILES from ODATA response 
            * @param {contxt} Fiori APP contxt
            * @param {oData} response from ODATA Read
            * @return {contxt} 
            * */
            _fetchFiles: function (contxt, oData){

                // delete contect Item Array and populate with the Item Array received from the Odata.Post

                contxt.toFiles = [];
                contxt.toFiles = oData.toFiles.results;
                       
              return contxt;
            },

            /**
            * From dd.mm.yyyy to yyyy-mm-dd
            * @param {mydate} Fiori APP contxt
            * @return {mydate} 
            * */
             _invert_date: function (mydate){
                const myArray = mydate.split(".");
                let dd = myArray[0];
                let mm = myArray[1];
                let yyyy = myArray[2];


                let new_date = yyyy + '-' + mm + '-' + dd ;

                return new_date;
              },


            /**
            * Get Fin Center from ODATA response 
            * @param {contxt} Fiori APP contxt
            * @param {oData} response from ODATA Read
            * @return {contxt} 
            * */
            _fetchCentre: function (contxt, oData){

                // delete contect Item Array and populate with the Item Array received from the Odata.Post

                contxt.toItems = [];
                contxt.toItems = oData.toItems.results;
                       
              return contxt;
            },

            /**
            * Get Duedate ODATA response 
            * @param {contxt} Fiori APP contxt
            * @param {oData} response from ODATA Read
            * @return {contxt} 
            * */
            _fetchDuedate: function (contxt, oData){
               
                   contxt.ParkedinvoiceH.Duedate =  oData.Duedate ;

              if ( contxt.ParkedinvoiceH.Duedate) {          
                    contxt.ParkedinvoiceH.Duedate = oData.Duedate.toLocaleDateString();  
                    contxt.ParkedinvoiceH.Duedate = contxt.ParkedinvoiceH.Duedate.replaceAll('/','-');  
                    contxt.ParkedinvoiceH.Duedate = this._format_date_from_DatePicker(contxt.ParkedinvoiceH.Duedate );
                    var owf_context = this.getModel();
                    owf_context.setProperty("/ParkedinvoiceH/Duedate",  contxt.ParkedinvoiceH.Duedate);
                 
                    owf_context.refresh();
              }

              return contxt;
            }
 
    });
  });