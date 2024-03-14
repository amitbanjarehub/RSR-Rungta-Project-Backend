const connectDB = require("../../config/db");
const ApiError = require("../utils/ApiError");

const studentDataQuery = async (student_id) => {
  const db = await connectDB();

  try {
    const query = await db.query(
      `select tbsem_year.sem_year_name,tblbranch_subject.branch_sub_name,tblcourse.cor_name,tblcollege.clg_name,tblsession_year.session_name,tblstud_profile.*,stud_current_sem_year.clg_id,stud_current_sem_year.cor_id,stud_current_sem_year.branch_id,stud_current_sem_year.sem_year_id 
        from tblstud_profile
        left join stud_current_sem_year on tblstud_profile.id=stud_current_sem_year.stud_id
        left join tblcollege on tblstud_profile.admis_on_clg_id=tblcollege.id
        left join tblcourse on tblstud_profile.admis_on_cor_id=tblcourse.id and tblcollege.id=tblcourse.clg_id
        left join tblbranch_subject on tblstud_profile.admis_on_bran_sub_id=tblbranch_subject.id
        left join tbsem_year on stud_current_sem_year.sem_year_id=tbsem_year.id
        left join tblsession_year on tblstud_profile.admission_year=tblsession_year.id
        where tblstud_profile.id=${student_id}`
    );

    return query[0][0];
  } catch (err) {
    console.log(err);
    throw new ApiError(500, "database error");
  }
};

const studentUpdateDataQuery = async (req) => {
  const student_id = req.params.id;

  console.log("student_id:------->>", student_id);

  console.log("studentUpdateDataQuery:======>>", req.body);

  try {
    const db = await connectDB();
    const student_id = req.params.id;
    const {
      fullName,
      email,
      dob,
      gender,
      category,
      handicapped,
      fatherName,
      motherName,
      aadharCardNumber,
      panCardNumber,
      careerChoice,
    } = req.body;

    console.log(`UPDATE tblstud_profile SET
    stud_name = '${fullName}',
    stud_email_id = '${email}',       
    stud_dob = '${dob}',
    stud_gender = ${gender},
    stud_category = ${category},
    handicapped_status = ${handicapped},
    stud_fathername = '${fatherName}',    
    stud_mothername = '${motherName}',       
    stud_adhar_no = ${aadharCardNumber},
    stud_pancard_no = '${panCardNumber}',
    career_choice = '${careerChoice}'
    WHERE id = ${student_id}`);

    const [query] = await db.query(
      `UPDATE tblstud_profile SET
      stud_name = '${fullName}',
      stud_email_id = '${email}',          
      stud_dob = '${dob}',
      stud_gender = ${gender},
      stud_category = ${category},
      handicapped_status = ${handicapped},
      stud_fathername = '${fatherName}',      
      stud_mothername = '${motherName}',              
      stud_adhar_no = ${aadharCardNumber},
      stud_pancard_no = '${panCardNumber}',
      career_choice = '${careerChoice}'
      WHERE id = ${student_id}`
    );

    console.log("query:======>>", query);
    console.log("query:======>>", query.affectedRows);

    if (query.affectedRows && query.affectedRows > 0) {
      // Update was successful
      return { success: true, message: "Update successful" };
    } else {
      // No rows were affected, update might not have happened
      return { success: false, message: "Update did not affect any rows" };
    }
  } catch (err) {
    console.error(err);
    throw new ApiError(500, "Database error");
  }
};

const studentTodayAttendanceQuery = async (
  todayDate,
  clg_id,
  cor_id,
  branch_id,
  sem_year_id,
  essl_id
) => {
  const db = await connectDB();

  try {
    const query = await db.query(
      `SELECT
      if( tblstud_profile.essl_id is not null, tblstud_profile.essl_id,'') as essl_id,
    tblstud_profile.stud_name,
    tblstud_profile.stud_mobile,
    tblstud_profile.atten_nonatten_priv,
    TIME(if(essl_attendance_log.InTime is not null,essl_attendance_log.InTime,'')) as inTime,
    if(essl_attendance_log.InTime is not null,'Present','Absent') as status,
    essl_attendance_log.EmployeeCode
   FROM
    tblcollege,
    tblcourse,
    tblbranch_subject,
    tbsem_year,
    stud_current_sem_year,
    tblstud_profile
   LEFT JOIN essl_attendance_log ON tblstud_profile.essl_id = essl_attendance_log.EmployeeCode AND  DATE(essl_attendance_log.InTime)=${todayDate}
   WHERE
    tblstud_profile.id = stud_current_sem_year.stud_id AND (tblstud_profile.current_status = 'regular' OR tblstud_profile.current_status = 'm_university' OR tblstud_profile.current_status = 'sem_global' OR tblstud_profile.current_status = 'x_regular') AND stud_current_sem_year.clg_id = tblcollege.id AND stud_current_sem_year.cor_id = tblcourse.id AND stud_current_sem_year.branch_id = tblbranch_subject.id AND stud_current_sem_year.sem_year_id = tbsem_year.id AND stud_current_sem_year.clg_id = ${clg_id} AND tblstud_profile.essl_id=${essl_id} AND stud_current_sem_year.cor_id = ${cor_id} AND stud_current_sem_year.branch_id = ${branch_id} AND stud_current_sem_year.sem_year_id = ${sem_year_id}
   GROUP BY
   tblstud_profile.id ORDER BY tblstud_profile.stud_name`
    );

    return query[0][0];
  } catch (err) {
    console.log(err);
    throw new ApiError(500, "database error");
  }
};

const studentSemesterStartEndDateQuery = async (student_id) => {
  const db = await connectDB();

  try {
    const query = await db.query(
      `SELECT
      tblstud_profile.essl_id,
      tblcollege.short_name AS clg_name,
      tblcourse.cor_name AS course_name,
      tblbranch_subject.branch_sub_name AS branch_name,
      tbsem_year.short_name AS sem_name,
      stud_current_sem_year.clg_id,
      stud_current_sem_year.cor_id,
      stud_current_sem_year.branch_id,
      stud_current_sem_year.sem_year_id,
      DATEDIFF(
          all_active_semester_year.class_end_date,
          all_active_semester_year.class_commencment_date
      ) AS total_class_days,
      CASE WHEN all_active_semester_year.class_end_date > CURDATE() THEN DATEDIFF(
          CURDATE(), all_active_semester_year.class_commencment_date) ELSE DATEDIFF(
              all_active_semester_year.class_end_date,
              all_active_semester_year.class_commencment_date
          )
      END AS date_difference,
      stud_current_sem_year.due_date,
      all_active_semester_year.fee_due_date,
      all_active_semester_year.class_commencment_date,
      all_active_semester_year.class_end_date,
      tblstud_profile.atten_nonatten_priv
      FROM
      tblstud_profile,
      stud_current_sem_year,
      tblcollege,
      tblcourse,
      tblbranch_subject,
      tbsem_year,
      all_active_semester_year
      WHERE
      tblstud_profile.id = stud_current_sem_year.stud_id AND
          stud_current_sem_year.stud_id = ${student_id} AND stud_current_sem_year.clg_id = tblcollege.id AND stud_current_sem_year.cor_id = tblcourse.id AND stud_current_sem_year.branch_id = tblbranch_subject.id AND stud_current_sem_year.sem_year_id = tbsem_year.id AND stud_current_sem_year.clg_id = all_active_semester_year.clg_id AND stud_current_sem_year.cor_id = all_active_semester_year.cor_id AND stud_current_sem_year.branch_id = all_active_semester_year.branch_id AND stud_current_sem_year.sem_year_id = all_active_semester_year.sem_id`
    );

    return query[0][0];
  } catch (err) {
    console.log(err);
    throw new ApiError(500, "database error");
  }
};

const semesterHolidayDatesQuery = async (
  start_date,
  end_date,
  clg_id,
  cor_id,
  branch_id,
  sem_year_id
) => {
  const db = await connectDB();

  try {
    const query = await db.query(
      `SELECT DATE_FORMAT(holidayDate, '%Y-%m-%d') AS holidayDate
        FROM holiday_master
        WHERE Date(holidayDate) BETWEEN '${start_date}' AND '${end_date}' AND ( (clgId=${clg_id} and corId='0' and branchId='0' and semId='0') or (clgId=${clg_id} and corId=${cor_id} and branchId=${branch_id} and semId=${sem_year_id} )) AND holidayDay!='Sunday' GROUP BY holidayDate`
    );

    return query[0];
  } catch (err) {
    console.log(err);
    throw new ApiError(500, "database error");
  }
};

const semesterHolidayDatesQuery1 = async (
  start_date,
  end_date,
  clg_id,
  cor_id,
  branch_id,
  sem_year_id
) => {
  const db = await connectDB();

  try {
    const query = await db.query(
      `SELECT DATE_FORMAT(holidayDate, '%Y-%m-%d') AS holidayDate,description
        FROM holiday_master
        WHERE Date(holidayDate) BETWEEN '${start_date}' AND '${end_date}' AND ( (clgId=${clg_id} and corId='0' and branchId='0' and semId='0') or (clgId=${clg_id} and corId=${cor_id} and branchId=${branch_id} and semId=${sem_year_id} )) AND holidayDay!='Sunday' GROUP BY holidayDate`
    );

    return query[0];
  } catch (err) {
    console.log(err);
    throw new ApiError(500, "database error");
  }
};

const studentPresentDatesQuery = async (essl_id, attendanceDates) => {
  const db = await connectDB();

  try {
    const query = await db.query(
      `SELECT
       *,
        DATE(essl_attendance_log.InTime) as attendedDate
      FROM
        essl_attendance_log
      WHERE
        essl_attendance_log.EmployeeCode = '${essl_id}' AND DATE(essl_attendance_log.InTime) IN (${attendanceDates
        .map((el) => `'${el}'`)
        .join(",")}) GROUP BY DATE(essl_attendance_log.InTime)`
    );

    //   console.log("object", `SELECT
    //   *,
    //    DATE(essl_attendance_log.InTime) as attendedDate
    //  FROM
    //    essl_attendance_log
    //  WHERE
    //    essl_attendance_log.EmployeeCode = '${essl_id}' AND DATE(essl_attendance_log.InTime) IN (${attendanceDates.map(el=> `'${el}'`).join(",")}) GROUP BY DATE(essl_attendance_log.InTime)`)

    return query[0];
  } catch (err) {
    console.log(err);
    throw new ApiError(500, "database error");
  }
};

const getHolidayMonthWiseQuery = async (
  month,
  year,
  clg_id,
  cor_id,
  branch_id,
  sem_year_id
) => {
  const db = await connectDB();

  try {
    const query = await db.query(
      `SELECT 
        DATE_FORMAT(holidayDate, '%Y-%m-%d') AS holidayDate,
        holiday_master.description 
    FROM 
        holiday_master 
    WHERE 
        MONTH(holidayDate) = ${month}
        AND YEAR(holidayDate) = ${year}
        AND (
            (clgId = '${clg_id}' AND corId = '0' AND branchId = '0' AND semId = '0') 
            OR 
            (clgId = '${clg_id}' AND corId = '${cor_id}' AND branchId = '${branch_id}' AND semId = '${sem_year_id}')
        ) 
        AND holidayDay != 'Sunday' 
    GROUP BY 
        description, holidayDate 
    ORDER BY 
        DATE(holidayDate)`
    );

    console.log(query);
    console.log("query.length:-------------->>", query[0].length);

    return query[0];
  } catch (err) {
    console.log(err);
    throw new ApiError(500, "database error");
  }
};

module.exports = {
  studentDataQuery,
  studentTodayAttendanceQuery,
  studentSemesterStartEndDateQuery,
  semesterHolidayDatesQuery,
  studentPresentDatesQuery,
  getHolidayMonthWiseQuery,
  studentUpdateDataQuery,
  semesterHolidayDatesQuery1
};
