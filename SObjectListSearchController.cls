public with sharing class SObjectListSearchController {
    
    @AuraEnabled(cacheable=true)
    public static List<sked__Location__c> getSObjects(
        String name,
        String address,
        String vaccineType,
        DateTime startDate,
        DateTime closingDate,
        Boolean archived
    ) {
        String query;
        system.debug('here is the archived value:' + archived);

        String condition = (String.isNotBlank(name)
            ? 'Internal_SObject_Name__c LIKE \'' + '%' + name + '%\''
            : '');

        condition += (String.isNotBlank(address)
            ? (String.isNotBlank(condition) ? +' AND ' : '') +
              ' sked__Address__c LIKE \'' +
              '%' + address +
              '%\''
            : '');

        condition += (String.isNotBlank(vaccineType)
            ? (String.isNotBlank(condition) ? +' AND ' : '') +
              ' Vaccine_Type2__c INCLUDES( \'' +
              + vaccineType + '\')'
            : '');

        condition += ((startDate != null)
            ? (String.isNotBlank(condition) ? +' AND ' : '') +
              ' skedbg__Start_Date__c >= '+ startDate.format('yyyy-MM-dd','change to UTC') 
            : '');

        condition += ((closingDate != null)
            ? (String.isNotBlank(condition) ? +' AND ' : '') +
              ' skedbg__Close_Date__c <= ' + closingDate.format('yyyy-MM-dd','change to UTC')
            : '');

        condition += ((archived != null)
            ? (String.isNotBlank(condition) ? +' AND ' : '') +
              ' Is_Archived__c = ' + archived
            : '');
        
        System.debug('condition ' + condition);
        if (String.isNotBlank(condition)) {
            query =
                'SELECT Id,Internal_SObject_Name__c,sked__Address__c,Vaccine_Type2__c,Vaccine_Supply_Tags_List__c,skedbg__Available_Date__c,skedbg__Start_Date__c,skedbg__Close_Date__c,Active__c,Is_Archived__c FROM sked__Location__c WHERE ' +
                condition +
                ' ORDER BY Internal_SObject_Name__c';
        } else {
            query = 'SELECT Id,Internal_SObject_Name__c,sked__Address__c,Vaccine_Type2__c,Vaccine_Supply_Tags_List__c,skedbg__Available_Date__c,skedbg__Start_Date__c,skedbg__Close_Date__c,Active__c,Is_Archived__c FROM sked__Location__c ORDER BY Internal_SObject_Name__c LIMIT 200';
        }

        List<sked__Location__c> records = Database.query(query);
        return records;
    }
}