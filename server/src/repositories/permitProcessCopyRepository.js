const db = require('../config/database');

async function executeCopy({ destinationPermitId, processType, mode, includeSteps, includeDocuments, steps, documents }) {
  return db.transaction(async () => {
    let replacedSteps = 0;
    let replacedDocuments = 0;
    if (mode === 'REPLACE' && includeSteps) {
      replacedSteps = (await db.query(
        'DELETE FROM work_permit_steps WHERE permit_id=$1 AND process_type=$2',
        [destinationPermitId, processType]
      )).rowCount;
    }
    if (mode === 'REPLACE' && includeDocuments) {
      replacedDocuments = (await db.query(
        'DELETE FROM permit_documents WHERE permit_id=$1 AND process_type=$2',
        [destinationPermitId, processType]
      )).rowCount;
    }
    let nextStep = Number((await db.query(
      'SELECT COALESCE(MAX(step_number),0) value FROM work_permit_steps WHERE permit_id=$1 AND process_type=$2',
      [destinationPermitId, processType]
    )).rows[0].value);
    for (const step of steps) {
      nextStep += 1;
      await db.query(
        `INSERT INTO work_permit_steps
          (permit_id,process_type,step_number,step_title,step_detail,expected_timeline)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [destinationPermitId,processType,nextStep,step.step_title,step.step_detail,step.expected_timeline]
      );
    }
    let nextDocument = Number((await db.query(
      'SELECT COALESCE(MAX(sort_order),0) value FROM permit_documents WHERE permit_id=$1 AND process_type=$2',
      [destinationPermitId, processType]
    )).rows[0].value);
    for (const document of documents) {
      nextDocument += 1;
      await db.query(
        `INSERT INTO permit_documents
          (permit_id,process_type,document_name,is_mandatory,notes,sort_order)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [destinationPermitId,processType,document.document_name,Boolean(document.is_mandatory),document.notes,nextDocument]
      );
    }
    return { replacedSteps, replacedDocuments };
  });
}

module.exports = { executeCopy };
