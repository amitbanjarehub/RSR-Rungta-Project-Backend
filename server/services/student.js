const moment = require("moment");
const connectDB = require("../../config/db");
const {
  studentDataQuery,
  studentTodayAttendanceQuery,
  studentSemesterStartEndDateQuery,
  semesterHolidayDatesQuery,
  studentPresentDatesQuery,
  getHolidayMonthWiseQuery,
  studentUpdateDataQuery,
  semesterHolidayDatesQuery1,
} = require("../queries/student");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { format } = require("mysql2");
const fs = require("fs").promises;
const path = require("path");

// Student Details  Services
const getAllData = asyncHandler(async (req, res, next) => {
  const params = req.params;

  const db = await connectDB();

  try {
    const studentData = await studentDataQuery(params.id);

    const multipleAccoutQuery = await db.query(
      `SELECT CASE WHEN COUNT(*) > 1 THEN 'true' ELSE 'false' END AS is_multiple_accounts FROM tblstud_profile WHERE stud_mobile="${studentData.stud_mobile}";`
    );

    const isMultipleAccount = multipleAccoutQuery[0][0].is_multiple_accounts;

    res
      .status(200)
      .json(new ApiResponse(200, { ...studentData, isMultipleAccount }));
  } catch (err) {
    console.log(err);
    throw new ApiError(500);
  }
});

// Student Attendance  Services

const todayAttendance = async (id) => {
  const studentData = await studentDataQuery(id);

  const { clg_id, cor_id, branch_id, sem_year_id, essl_id } = studentData;

  const formattedDate = format(new Date(), "yyyy-MM-dd");
  const todayDate = formattedDate.toISOString().split("T")[0];

  const studentTodayAttendance = await studentTodayAttendanceQuery(
    todayDate,
    clg_id,
    cor_id,
    branch_id,
    sem_year_id,
    essl_id
  );

  return studentTodayAttendance;
};

const getAttendanceToday = asyncHandler(async (req, res) => {
  const db = await connectDB();

  const { todayDate } = req.body;

  const params = req.params;
  if (!req.userIds.includes(params.id)) {
    throw new ApiError(401, "Unauthorized");
  }

  try {
    const studentData = await studentDataQuery(params.id);

    const { clg_id, cor_id, branch_id, sem_year_id, essl_id } = studentData;

    const studentTodayAttendance = await studentTodayAttendanceQuery(
      todayDate,
      clg_id,
      cor_id,
      branch_id,
      sem_year_id,
      essl_id
    );

    res.status(200).json(new ApiResponse(200, studentTodayAttendance));
  } catch (err) {
    console.log(err);
    throw new ApiError(404, "Today attendance was not found ..!");
  }
});

const getAcademicTenure = asyncHandler(async (req, res) => {
  const db = await connectDB();

  const params = req.params;
  if (!req.userIds.includes(params.id)) {
    throw new ApiError(401, "Unauthorized");
  }

  try {
    const studentSemesterStartEndDate = await studentSemesterStartEndDateQuery(
      params.id
    );

    const studTillDatePresentDates = await studPresentDatesForTillDates(
      params.id
    );

    const holidayDates = await semester_holiday_dates(params.id);

    const holidayDatesResason = await semester_holiday_dates1(params.id);
    // console.log("holidayDatesResason:=========>>", holidayDatesResason)

    const toadyAtt = await todayAttendance(params.id);

    res.status(200).json(
      new ApiResponse(200, {
        ...studentSemesterStartEndDate,
        ...toadyAtt,
        today_attendance_status: toadyAtt?.status,
        employee_code: toadyAtt?.EmployeeCode,
        student_present_dates: studTillDatePresentDates,
        holiday_dates: holidayDates,
        holiday_reason: holidayDatesResason,
      })
    );
  } catch (err) {
    console.log(err);
    throw new ApiError(404, "Semester start and end dates was not found ..!");
  }
});
// Function  1.semester_holiday_dates
const semester_holiday_dates = async (id) => {
  const studentSemesterStartEndDate = await studentSemesterStartEndDateQuery(
    id
  );

  const {
    class_commencment_date,
    class_end_date,
    clg_id,
    cor_id,
    branch_id,
    sem_year_id,
  } = studentSemesterStartEndDate;

  const semesterHolidayDates = await semesterHolidayDatesQuery(
    class_commencment_date,
    class_end_date,
    clg_id,
    cor_id,
    branch_id,
    sem_year_id
  );

  const holidayDatesArray = semesterHolidayDates.map(
    (holiday) => holiday.holidayDate
  );

  return holidayDatesArray;
};

const semester_holiday_dates1 = async (id) => {
  const studentSemesterStartEndDate = await studentSemesterStartEndDateQuery(
    id
  );

  const {
    class_commencment_date,
    class_end_date,
    clg_id,
    cor_id,
    branch_id,
    sem_year_id,
  } = studentSemesterStartEndDate;

  const semesterHolidayDates = await semesterHolidayDatesQuery1(
    class_commencment_date,
    class_end_date,
    clg_id,
    cor_id,
    branch_id,
    sem_year_id
  );

  return semesterHolidayDates;
};

// Function 2.studPresentDatesForTillDates
const studPresentDatesForTillDates = async (id) => {
  const todayDate = format(new Date(), "yyyy-MM-dd");
  const formattedDate = todayDate.toISOString().split("T")[0];

  const studentStartEndDate = await studentSemesterStartEndDateQuery(id);

  const { essl_id, class_commencment_date, class_end_date } =
    studentStartEndDate;

  let sem_end_date;
  if (formattedDate >= class_end_date) {
    sem_end_date = class_end_date;
  } else {
    sem_end_date = formattedDate;
  }

  const startDate = moment(class_commencment_date);
  const endDate = moment(sem_end_date);

  const semester_start_end_datesArray = [];
  let currentDate = startDate.clone();
  while (currentDate.isSameOrBefore(endDate, "day")) {
    semester_start_end_datesArray.push(currentDate.format("YYYY-MM-DD"));
    currentDate.add(1, "day");
  }

  const holiday_Dates = await semester_holiday_dates(id);

  const uniqueDatesArray =
    holiday_Dates &&
    [
      ...semester_start_end_datesArray.filter(
        (date) => !holiday_Dates.includes(date)
      ),
    ].sort((a, b) => {
      const dateA = new Date(a);
      const dateB = new Date(b);
      return dateA - dateB;
    });

  const studentPresentDates = await studentPresentDatesQuery(
    essl_id,
    uniqueDatesArray
  );

  const AttendanceDatesArray = studentPresentDates.map(
    (datesArray) => new Date(datesArray.AttendanceDate)
  );
  // my const date give  this formate date 2024-02-23T10:36:23.845Z
  const datesOnlyArray = AttendanceDatesArray.map((timestamp) => {
    const dateOnly = new Date(timestamp).toISOString().split("T")[0];
    return dateOnly;
  });

  return datesOnlyArray;
};

const getSemesterHolidayDates = asyncHandler(async (req, res, next) => {
  const db = await connectDB();

  const params = req.params;

  try {
    const Dates = await semester_holiday_dates(params.id);

    res.status(200).json(
      new ApiResponse(200, {
        holidayDates: Dates,
      })
    );
  } catch (err) {
    console.log(err);
    throw new ApiError(404, "Number of holidays was not found ..!");
  }
});

const getAcademicPresentTillDates = asyncHandler(async (req, res) => {
  const db = await connectDB();

  const { tillDates } = req.body;
  console.log("tillDates:===>>", tillDates);

  const params = req.params;
  if (!req.userIds.includes(params.id)) {
    throw new ApiError(401, "Unauthorized");
  }
  try {
    const studentStartEndDate = await studentSemesterStartEndDateQuery(
      params.id
    );

    const { essl_id, class_commencment_date } = studentStartEndDate;

    const class_end_date = tillDates;
    const startDate = moment(class_commencment_date);
    const endDate = moment(class_end_date);

    const semester_start_end_datesArray = [];
    let currentDate = startDate.clone();
    while (currentDate.isSameOrBefore(endDate, "day")) {
      semester_start_end_datesArray.push(currentDate.format("YYYY-MM-DD"));
      currentDate.add(1, "day");
    }

    const holiday_Dates = await semester_holiday_dates(params.id);

    const uniqueDatesArray =
      holiday_Dates &&
      [
        ...semester_start_end_datesArray.filter(
          (date) => !holiday_Dates.includes(date)
        ),
      ].sort((a, b) => {
        const dateA = new Date(a);
        const dateB = new Date(b);
        return dateA - dateB;
      });

    const studentPresentDates = await studentPresentDatesQuery(
      essl_id,
      uniqueDatesArray
    );

    const AttendanceDatesArray = studentPresentDates.map(
      (datesArray) => new Date(datesArray.AttendanceDate)
    );
    // my const date give  this formate date 2024-02-23T10:36:23.845Z
    const datesOnlyArray = AttendanceDatesArray.map((timestamp) => {
      const dateOnly = new Date(timestamp).toISOString().split("T")[0];
      return dateOnly;
    });

    res
      .status(200)
      .json(new ApiResponse(200, { presentDates: datesOnlyArray }));
  } catch (err) {
    console.log(err);
    throw new ApiError(404, "Students attendance dates was not found ..!");
  }
});

const getAcademicPresentDates = asyncHandler(async (req, res) => {
  const db = await connectDB();

  const { tillDates } = req.body;

  const params = req.params;
  if (!req.userIds.includes(params.id)) {
    throw new ApiError(401, "Unauthorized");
  }
  try {
    const studentStartEndDate = await studentSemesterStartEndDateQuery(
      params.id
    );

    const { essl_id, class_commencment_date, class_end_date } =
      studentStartEndDate;

    // console.log(essl_id, class_commencment_date, class_end_date);

    const startDate = moment(class_commencment_date);
    const endDate = moment(class_end_date);

    // const getTodayDate = new Date();
    // const todayDate = getTodayDate.toISOString().split('T')[0];
    if (tillDates != "" || tillDates != null) {
      // endDate = tillDates;
      console.log("tillDates123:===>>", tillDates);
    }

    const semester_start_end_datesArray = [];
    let currentDate = startDate.clone();
    while (currentDate.isSameOrBefore(endDate, "day")) {
      semester_start_end_datesArray.push(currentDate.format("YYYY-MM-DD"));
      currentDate.add(1, "day");
    }

    const holiday_Dates = await semester_holiday_dates(params.id);

    const uniqueDatesArray =
      holiday_Dates &&
      [
        ...semester_start_end_datesArray.filter(
          (date) => !holiday_Dates.includes(date)
        ),
      ].sort((a, b) => {
        const dateA = new Date(a);
        const dateB = new Date(b);
        return dateA - dateB;
      });

    const studentPresentDates = await studentPresentDatesQuery(
      essl_id,
      uniqueDatesArray
    );

    const AttendanceDatesArray = studentPresentDates.map(
      (datesArray) => new Date(datesArray.AttendanceDate)
    );
    // my const date give  this formate date 2024-02-23T10:36:23.845Z
    const datesOnlyArray = AttendanceDatesArray.map((timestamp) => {
      const dateOnly = new Date(timestamp).toISOString().split("T")[0];
      return dateOnly;
    });

    res
      .status(200)
      .json(new ApiResponse(200, { presentDates: datesOnlyArray }));
  } catch (err) {
    console.log(err);
    throw new ApiError(404, "Students attendance dates was not found ..!");
  }
});

const getHolidayMonthWise = asyncHandler(async (req, res) => {
  const db = await connectDB();

  const { month, year } = req.body;

  const params = req.params;
  if (!req.userIds.includes(params.id)) {
    throw new ApiError(401, "Unauthorized");
  }
  try {
    const studentData = await studentDataQuery(params.id);

    const { clg_id, cor_id, branch_id, sem_year_id } = studentData;

    const getHolidayMonthWise1 = await getHolidayMonthWiseQuery(
      month,
      year,
      clg_id,
      cor_id,
      branch_id,
      sem_year_id
    );

    res.status(200).json(
      new ApiResponse(200, {
        getHolidayMonthWise: getHolidayMonthWise1,
      })
    );
  } catch (err) {
    console.log(err);
    throw new ApiError(404, "Subject information was not found ..!");
  }
});

const holidayMonthWise = asyncHandler(async (req, res) => {
  const db = await connectDB();

  const { month, year, clgIdMain, corIdMain, braIdMain, semIdMain } = req.body;

  try {
    const getAttendancesDates = await db.query(
      `SELECT holiday_master.holidayDate,holiday_master.description FROM holiday_master WHERE month(holidayDate)=${month} AND year(holidayDate)=${year} AND ( (clgId=${clgIdMain} and corId='0' and branchId='0' and semId='0') or (clgId=${clgIdMain} and corId=${corIdMain} and branchId=${braIdMain} and semId=${semIdMain})) AND holidayDay!='Sunday' GROUP BY description,holidayDate ORDER BY DATE(holidayDate)`
    );
    res.status(200).json(new ApiResponse(200, getAttendancesDates[0]));
  } catch (err) {
    console.log(err);
    throw new ApiError(404, "Holiday Month Wise was not found ..!");
  }
});

// Academic Information Services
const subjectInformation = asyncHandler(async (req, res) => {
  const db = await connectDB();

  const params = req.params;
  if (!req.userIds.includes(params.id)) {
    throw new ApiError(401, "Unauthorized");
  }

  try {
    const subjectInformation = await db.query(
      `SELECT
      faculty_subject_unit_allotment.id,
      subject_allotment.subject_name,
      subject_allotment.id AS subject_id,
      employee_master.emp_name,
      subject_allotment.subject_type,
      faculty_subject_unit_allotment.emp_id
      FROM
      faculty_subject_unit_allotment
      INNER JOIN stud_current_sem_year ON faculty_subject_unit_allotment.clg_id = stud_current_sem_year.clg_id AND faculty_subject_unit_allotment.courseID = stud_current_sem_year.cor_id AND faculty_subject_unit_allotment.branch_id = stud_current_sem_year.branch_id 
      LEFT JOIN subject_allotment ON faculty_subject_unit_allotment.subject_id = subject_allotment.id
      LEFT JOIN employee_master ON faculty_subject_unit_allotment.emp_id = employee_master.emp_id
      WHERE
      stud_current_sem_year.stud_id =${params.id} AND subject_allotment.subject_name is not null`
    );

    // console.log("subjectInformation[0]:========>>", subjectInformation[0])

    res.status(200).json(
      new ApiResponse(200, {
        subjectInformation: subjectInformation[0],
        totalSubject: subjectInformation[0].length,
      })
    );
  } catch (err) {
    console.log(err);
    throw new ApiError(404, "Subject information was not found ..!");
  }
});

const getNotes = asyncHandler(async (req, res) => {
  const db = await connectDB();

  const { clg_id, branch_id, cor_id } = req.body;

  const params = req.params;
  if (!req.userIds.includes(params.id)) {
    throw new ApiError(401, "Unauthorized");
  }
  try {
    const notes = await db.query(
      `select tbl_notes.*,employee_master.emp_name  from  tbl_notes left join employee_master on tbl_notes.created_by=employee_master.emp_id  where clg_id=${clg_id} and branch_id=${branch_id} and   cor_id=${cor_id}`
    );

    res.status(200).json(
      new ApiResponse(200, {
        notes: notes[0],
        totalnotes: notes[0].length,
      })
    );
  } catch (err) {
    console.log(err);
    throw new ApiError(404, "Notes was not found ..!");
  }
});

const subjectUnitInformation = asyncHandler(async (req, res) => {
  const db = await connectDB();

  // console.log("req:====>>", req)
  // const { emp_id, subject_id } = req.body;
  // console.log("req.body:====>>", req.body)

  const { emp_id, subject_id } = req.query;
  // console.log("emp_id:===>>", emp_id)
  // console.log("subject_id:===>>", subject_id)
  // console.log("req.query:====>>", req.query)
  // console.log("req.body:====>>", req.body)

  const params = req.params;
  if (!req.userIds.includes(params.id)) {
    throw new ApiError(401, "Unauthorized");
  }
  try {
    const subjectUnitInformation = await db.query(
      `select *,(select count(id) from assignment_questions_by_faculty where assignment_id=unit_topic_selection_by_faculty.id) as no_of_que from unit_topic_selection_by_faculty where faculty_id=${emp_id} and subject_id=${subject_id}`
    );

    res.status(200).json(
      new ApiResponse(200, {
        subjectUnitInformation: subjectUnitInformation[0],
        totalSubjectUnitInformation: subjectUnitInformation[0].length,
      })
    );
  } catch (err) {
    console.log(err);
    throw new ApiError(404, "Subject information was not found ..!");
  }
});

const getNotesFiles = asyncHandler(async (req, res) => {
  const db = await connectDB();

  const { u_id } = req.body;

  const params = req.params;
  if (!req.userIds.includes(params.id)) {
    throw new ApiError(401, "Unauthorized");
  }
  try {
    const getNotesFiles = await db.query(
      `SELECT  group_concat(notes_file_name) as notes FROM unit_wise_notes where unit_id =${u_id}`
    );

    res.status(200).json(
      new ApiResponse(200, {
        getNotesFiles: getNotesFiles[0],
        totalGetNotesFiles: getNotesFiles[0].length,
      })
    );
  } catch (err) {
    console.log(err);
    throw new ApiError(404, "Subject information was not found ..!");
  }
});

const getAssignmentQquestionsByFaculty = asyncHandler(async (req, res) => {
  const db = await connectDB();

  const { mcq_id } = req.body;

  const params = req.params;
  if (!req.userIds.includes(params.id)) {
    throw new ApiError(401, "Unauthorized");
  }
  try {
    const assignmentQquestionsByFaculty = await db.query(
      `select * from assignment_questions_by_faculty where assignment_id=${mcq_id}`
    );

    res.status(200).json(
      new ApiResponse(200, {
        assignmentQquestionsByFaculty: assignmentQquestionsByFaculty[0],
        totalAssignmentQquestionsByFaculty:
          assignmentQquestionsByFaculty[0].length,
      })
    );
  } catch (err) {
    console.log(err);
    throw new ApiError(404, "Subject information was not found ..!");
  }
});

const getShowMCQQuestionAanswer = asyncHandler(async (req, res) => {
  const db = await connectDB();

  const { mcq_id, topic_id, subject_id, student_id, teacher_id } = req.body;

  const params = req.params;
  if (!req.userIds.includes(params.id)) {
    throw new ApiError(401, "Unauthorized");
  }
  try {
    const getShowMCQQuestionAanswer = await db.query(
      `select 
      assignment_question_submitted_by_students.answer1,
      assignment_question_submitted_by_students.answer2,
      assignment_question_submitted_by_students.answer3,
      assignment_questions_by_faculty.ques1,
      assignment_questions_by_faculty.q1op1,
      assignment_questions_by_faculty.q1op2,
      assignment_questions_by_faculty.q1op3,
      assignment_questions_by_faculty.q1op4,
      assignment_questions_by_faculty.ques2,
      assignment_questions_by_faculty.q2op1,
      assignment_questions_by_faculty.q2op2,
      assignment_questions_by_faculty.q2op3,
      assignment_questions_by_faculty.q2op4,
      assignment_questions_by_faculty.ques3,
      assignment_questions_by_faculty.q3op1,
      assignment_questions_by_faculty.q3op2,
      assignment_questions_by_faculty.q3op3,
      assignment_questions_by_faculty.q3op4,
      assignment_questions_by_faculty.q1_corr_op,
      assignment_questions_by_faculty.q2_corr_op,
      assignment_questions_by_faculty.q3_corr_op,
      assignment_question_submitted_by_students.mark_obtained

      from 
      assignment_questions_by_faculty 
      LEFT JOIN assignment_question_submitted_by_students ON assignment_questions_by_faculty.notes_submitted_by_faculty_id =assignment_question_submitted_by_students.assignment_id
      where assignment_question_submitted_by_students.assignment_id=${mcq_id} and assignment_question_submitted_by_students.topic_id=${topic_id} and assignment_question_submitted_by_students.subject_id=${subject_id} and assignment_question_submitted_by_students.student_id=${student_id} and assignment_question_submitted_by_students.teacher_id=${teacher_id}`
    );

    res.status(200).json(
      new ApiResponse(200, {
        getShowMCQQuestionAanswer: getShowMCQQuestionAanswer[0],
        totalGetShowMCQQuestionAanswer: getShowMCQQuestionAanswer[0].length,
      })
    );
  } catch (err) {
    console.log(err);
    throw new ApiError(404, "Subject information was not found ..!");
  }
});

const getBookList = asyncHandler(async (req, res) => {
  const db = await connectDB();

  const { searchBookName, clg_id } = req.body;

  const params = req.params;
  if (!req.userIds.includes(params.id)) {
    throw new ApiError(401, "Unauthorized");
  }
  try {
    const getBookList = await db.query(
      `SELECT * FROM accession_detail WHERE (title LIKE '% ${searchBookName} %' OR author LIKE '% ${searchBookName} %') AND (clg_id=${clg_id}) AND book_status<>'1' GROUP BY book_id`
    );

    res.status(200).json(
      new ApiResponse(200, {
        getBookList: getBookList[0],
      })
    );
  } catch (err) {
    console.log(err);
    throw new ApiError(404, "Book list was not found ..!");
  }
});

const getTesting = asyncHandler(async (req, res) => {
  const db = await connectDB();

  console.log("req.params:---------->>", req.params.id);
  const id = req.params.id;
  const studentData = await studentDataQuery(id);
  const { clg_id } = studentData;
  console.log("clg_id:---------->>", clg_id);

  try {
    const getBookList = await db.query(
      `SELECT * FROM accession_detail WHERE (clg_id=${clg_id}) AND book_status<>'1' GROUP BY book_id`
    );

    console.log("getBookList[0].length:===========>>", getBookList[0].length);

    res.status(200).json(new ApiResponse(200, getBookList[0]));
  } catch (err) {
    console.log(err);
    throw new ApiError(404, "Book list was not found ..!");
  }
});

const checkBookIssueByStudent = asyncHandler(async (req, res) => {
  const db = await connectDB();

  const { book_id } = req.body;

  const params = req.params;
  if (!req.userIds.includes(params.id)) {
    throw new ApiError(401, "Unauthorized");
  }
  try {
    const checkForBookBankIssue = await db.query(
      `SELECT * FROM book_bank_issue WHERE is_return='1' AND student_id=${params.id} AND book_id=${book_id}`
    );

    console.log(
      "checkForBookBankIssueQuery:-------->>",
      `SELECT * FROM book_bank_issue WHERE is_return='1' AND student_id=${params.id} AND book_id=${book_id}`
    );
    console.log("checkForBookBankIssue:----------->>", checkForBookBankIssue);

    const checkForBookIssueMaster = await db.query(
      `SELECT * FROM book_issue_master WHERE book_issue_status='1' AND student_id=${params.id} AND book_id=${book_id}`
    );

    console.log(
      "checkForBookIssueMaster:-------->>",
      `SELECT * FROM book_issue_master WHERE book_issue_status='1' AND student_id=${params.id} AND book_id=${book_id}`
    );
    console.log(
      "checkForBookIssueMaster:----------->>",
      checkForBookIssueMaster
    );

    res.status(200).json(
      new ApiResponse(200, {
        checkFor_Book_Bank_Issue: checkForBookBankIssue[0],
        checkFor_Book_Issue_Master: checkForBookIssueMaster[0],
      })
    );
  } catch (err) {
    console.log(err);
    throw new ApiError(404, "Book list was not found ..!");
  }
});

const checkBookRequestByStudent = asyncHandler(async (req, res) => {
  const db = await connectDB();

  const { book_id } = req.body;

  const params = req.params;
  if (!req.userIds.includes(params.id)) {
    throw new ApiError(401, "Unauthorized");
  }
  try {
    const checkForBookRequest = await db.query(
      `SELECT * FROM book_request WHERE stud_id=${params.id} AND book_id=${book_id} AND request_status='0'`
    );

    console.log(
      `SELECT * FROM book_request WHERE stud_id=${params.id} AND book_id=${book_id} AND request_status='0'`
    );

    res.status(200).json(new ApiResponse(200, checkForBookRequest[0]));
  } catch (err) {
    console.log(err);
    throw new ApiError(404, "Book list was not found ..!");
  }
});

const checkBookIssueByStudentFunction = async (req) => {
  try {
    const { userId, book_id } = req.body;

    console.log("userId:", userId);
    console.log("book_id:", book_id);

    const db = await connectDB();

    const checkForBookBankIssue = await db.query(
      `SELECT * FROM book_bank_issue WHERE is_return='1' AND student_id=${userId} AND book_id=${book_id}`
    );

    const checkForBookIssueMaster = await db.query(
      `SELECT * FROM book_issue_master WHERE book_issue_status='1' AND student_id=${userId} AND book_id=${book_id}`
    );
  } catch (error) {
    console.error("Error in checkBookIssueByStudentFunction:", error);
    // Handle errors if necessary
  }
};

// const bookRequest = asyncHandler(async (req, res) => {
//   const db = await connectDB();
//   const params = req.params;

//   const studentData = await studentDataQuery(params.id);
//   const { clg_id, cor_id, branch_id, sem_year_id } = studentData;

//   const date_time = moment().format("MM/DD/YYYY hh:mm A");

//   const { book_id, title, author, edition, volume } = req.body;

//   if (!req.userIds.includes(params.id)) {
//     throw new ApiError(401, "Unauthorized");
//   }

//   try {
//     const checkForBookBankIssue = await db.query(
//       `SELECT * FROM book_bank_issue WHERE is_return='1' AND student_id='${params.id}' AND book_id='${book_id}'`
//     );

//     if (checkForBookBankIssue[0].length > 0) {
//       return res.status(200).json(
//         new ApiResponse(200, "Book already issued from book bank.")
//       );
//     } else {
//       const checkForBookIssueMaster = await db.query(
//         `SELECT * FROM book_issue_master WHERE book_issue_status='1' AND student_id=${params.id} AND book_id=${book_id}`
//       );

//       if (checkForBookIssueMaster[0].length > 0) {
//         return res
//           .status(200)
//           .json(new ApiResponse(200,  "Book is already issued." ));
//       } else {
//         const checkForBookRequest = await db.query(
//           `SELECT * FROM book_request WHERE  stud_id=${params.id} AND book_id=${book_id}`
//         );

//         if (checkForBookRequest[0].length > 0) {
//           return res
//             .status(200)
//             .json(
//               new ApiResponse(200,  "Book is already requested." )
//             );
//         } else {
//           const addBookRequest = await db.query(
//             `INSERT INTO book_request(stud_id, clg_id, cor_id, branch_id, sem_id, book_id, request_status, book_title, book_author, book_volume, book_edition, created_by, created_on, updated_by, updated_on) VALUES (${params.id},${clg_id},${cor_id},${branch_id},${sem_year_id},${book_id},'0','${title}','${author}','${edition}','${volume}',${params.id},'${date_time}','','')`
//           );

//           return res.status(200).json(new ApiResponse(200, addBookRequest, "Book is requested successfully."));
//         }
//       }
//     }
//   } catch (err) {
//     console.log(err);
//     throw new ApiError(404, "Add Book Request Failed..!");
//   }
// });

const bookRequest = asyncHandler(async (req, res) => {
  const db = await connectDB();
  const params = req.params;

  const studentData = await studentDataQuery(params.id);
  const { clg_id, cor_id, branch_id, sem_year_id } = studentData;

  const date_time = moment().format("MM/DD/YYYY hh:mm A");

  const { book_id, title, author, edition, volume } = req.body;

  if (!req.userIds.includes(params.id)) {
    throw new ApiError(401, "Unauthorized");
  }

  try {
    const checkForBookBankIssue = await db.query(
      `SELECT * FROM book_bank_issue WHERE is_return='1' AND student_id='${params.id}' AND book_id='${book_id}'`
    );

    if (checkForBookBankIssue[0].length > 0) {
      return res.status(200).json(
        new ApiResponse(200, {
          message: "Book already issued from book bank.",
        })
      );
    } else {
      const checkForBookIssueMaster = await db.query(
        `SELECT * FROM book_issue_master WHERE book_issue_status='1' AND student_id=${params.id} AND book_id=${book_id}`
      );

      if (checkForBookIssueMaster[0].length > 0) {
        return res
          .status(200)
          .json(new ApiResponse(200, { message: "Book is already issued." }));
      } else {
        const checkForBookRequest = await db.query(
          `SELECT * FROM book_request WHERE  stud_id=${params.id} AND book_id=${book_id}`
        );

        if (checkForBookRequest[0].length > 0) {
          return res
            .status(200)
            .json(
              new ApiResponse(200, { message: "Book is already requested." })
            );
        } else {
          const addBookRequest = await db.query(
            `INSERT INTO book_request(stud_id, clg_id, cor_id, branch_id, sem_id, book_id, request_status, book_title, book_author, book_volume, book_edition, created_by, created_on, updated_by, updated_on) VALUES (${params.id},${clg_id},${cor_id},${branch_id},${sem_year_id},${book_id},'0','${title}','${author}','${edition}','${volume}',${params.id},'${date_time}','','')`
          );

          return res.status(200).json(
            new ApiResponse(200, {
              message: "Book is requested successfully.",
            })
          );
        }
      }
    }
  } catch (err) {
    console.log(err);
    throw new ApiError(404, "Add Book Request Failed..!");
  }
});

const bookRequestStatus = asyncHandler(async (req, res) => {
  const db = await connectDB();

  const params = req.params;
  if (!req.userIds.includes(params.id)) {
    throw new ApiError(401, "Unauthorized");
  }
  try {
    const bookRequestStatus = await db.query(
      `SELECT
      book_request.id as req_id,
      tblstud_profile.stud_name,
      tblstud_profile.id as stud_id,
      tblcollege.short_name,
      tblcollege.id as clg_id,
      tblcourse.cor_name,
      tblcourse.id as cor_id,
      tblbranch_subject.branch_sub_name,
      tblbranch_subject.id as branch_id,
      book_request.book_id,
      book_request.sem_id,
      book_request.book_title,
      book_request.book_author,
      book_request.book_volume,
      book_request.book_edition,
      book_request.created_on,
      book_request.request_status
      FROM
          book_request
      LEFT JOIN tblcollege ON book_request.clg_id=tblcollege.id
      LEFT JOIN tblstud_profile ON tblstud_profile.id=book_request.stud_id
      LEFT JOIN tblcourse ON tblcourse.id=book_request.cor_id
      LEFT JOIN tblbranch_subject ON tblbranch_subject.id=book_request.branch_id
      WHERE
          book_request.stud_id = ${params.id}`
    );

    res
      .status(200)
      .json(new ApiResponse(200, { requestedBooks: bookRequestStatus[0] }));
  } catch (err) {
    console.log(err);
    throw new ApiError(404, "Add Book Request Failed..!");
  }
});

const updateData = asyncHandler(async (req, res) => {
  const params = req.params;
  if (!req.userIds.includes(params.id)) {
    throw new ApiError(401, "Unauthorized");
  }
  try {
    const updateData = await studentUpdateDataQuery(req);

    console.log("updateData:====>>", updateData);

    res.status(200).json(new ApiResponse(200, updateData));
  } catch (err) {
    console.log(err);
    throw new ApiError(404, "Add Book Request Failed..!");
  }
});

const updateFileData = asyncHandler(async (req, res) => {
  const params = req.params;
  if (!req.userIds.includes(params.id)) {
    throw new ApiError(401, "Unauthorized");
  }
  try {
    console.log("request:============>>", req);

    // const updateData = await studentUpdateFileDataQuery(req);

    // console.log("updateData:====>>", updateData);

    // res
    //   .status(200)
    //   .json(
    //     new ApiResponse(200, updateData )
    //   );
  } catch (err) {
    console.log(err);
    throw new ApiError(404, "Add Book Request Failed..!");
  }
});

//Hostel Gate Pass

const appliedGatePass = asyncHandler(async (req, res) => {
  const db = await connectDB();

  const params = req.params;
  if (!req.userIds.includes(params.id)) {
    throw new ApiError(401, "Unauthorized");
  }
  try {
    const appliedGatePass = await db.query(
      `SELECT
      out_time_appplied as OutTime,
      in_time_applied as InTime,
      applyig_reason as Reason,
      applied_on as AppliedON
  FROM
      hostel_gate_pass
  WHERE
      stud_id = '${params.id}' AND approved_by=0`
    );

    res
      .status(200)
      .json(new ApiResponse(200, { appliedGatePass: appliedGatePass[0] }));
  } catch (err) {
    console.log(err);
    throw new ApiError(404, " Request Failed..!");
  }
});

const hostelDetailFunction = async (id) => {
  console.log("id:----------->>", id);
  const db = await connectDB();

  try {
    const checkHostelStudent = await db.query(
      `SELECT
      hostel_allotment_log.bed_id,
      hostel_allotment_log.hostel_id,
      hostel_allotment_log.room_id,
      hostel_allotment_log.room_type,
      hostel_allotment_log.room_no,
      stud_current_sem_year.clg_id,
      stud_current_sem_year.cor_id,
      stud_current_sem_year.sem_year_id,
      stud_current_sem_year.branch_id
  FROM
      stud_current_sem_year,
      hostel_allotment_log
  WHERE
      stud_current_sem_year.stud_id = ${id} AND hostel_allotment_log.stud_id = stud_current_sem_year.stud_id AND hostel_allotment_log.allotment_status = '1'`
    );

    return checkHostelStudent[0][0];
  } catch (err) {
    console.log(err);
    throw new ApiError(404, "Request Failed..!");
  }
};

const applyHostelGatePass = asyncHandler(async (req, res) => {
  console.log(" applyHostelGatePass request:-------->>", req);

  const db = await connectDB();

  const params = req.params;
  if (!req.userIds.includes(params.id)) {
    throw new ApiError(401, "Unauthorized");
  }

  try {
    const currentDateTime = moment().format("YYYY-MM-DD HH:mm:ss");

    const hostelDeatails = await hostelDetailFunction(params.id);

    const {
      hostel_id,
      room_id,
      bed_id,
      room_type,
      room_no,
      clg_id,
      cor_id,
      branch_id,
      sem_year_id,
    } = hostelDeatails;

    const { outTime, inTime, reason, outDate, inDate } = req.body;

    const gatePassApplied = await db.query(
      `insert into  hostel_gate_pass set hostel_id='${hostel_id}' , room_id='${room_id}' , bed_id='${bed_id}' ,  room_type='${room_type}', room_no='${room_no}', stud_id='${params.id}', clg_id='${clg_id}', cor_id='${cor_id}', branch_id='${branch_id}', sem_id='${sem_year_id}', out_time_appplied='${outTime}', in_time_applied='${inTime}', applied_on='${currentDateTime}' ,applyig_reason='${reason}',out_date_apply='${outDate}',in_date_apply='${inDate}'`
    );

    const affectedRows = gatePassApplied[0].affectedRows;

    if (affectedRows > 0) {
      res
        .status(201)
        .json(
          new ApiResponse(201, { message: "Gate pass applied successfully" })
        );
    } else {
      res.status(500).json(
        new ApiResponse(500, {
          message: "An error occurred while applying gate pass",
        })
      );
    }
  } catch (err) {
    console.error("Error applying gate pass:", err);

    throw new ApiError({ error: "An error occurred while applying gate pass" });
  }
});

const rejectedGatePass = asyncHandler(async (req, res) => {
  const db = await connectDB();

  const params = req.params;
  if (!req.userIds.includes(params.id)) {
    throw new ApiError(401, "Unauthorized");
  }
  try {
    const rejectedGatePass = await db.query(
      `SELECT
      id AS ID,
      out_time_appplied AS OutTime,
      in_time_applied AS InTime,
      applyig_reason AS Reason,
      applied_on AS AppliedON,
      reject_remark AS Reject_remark,
      employee_master.emp_name AS RejectedBy
  FROM
      hostel_gate_pass,
      employee_master
  WHERE
      stud_id = '${params.id}' AND employee_master.emp_id = hostel_gate_pass.approved_by AND hostel_gate_pass.reject_status=1;`
    );

    console.log(
      "rejectedGatePass:=====>>",
      `SELECT
    id AS ID,
    out_time_appplied AS OutTime,
    in_time_applied AS InTime,
    applyig_reason AS Reason,
    applied_on AS AppliedON,
    reject_remark AS Reject_remark,
    employee_master.emp_name AS RejectedBy
FROM
    hostel_gate_pass,
    employee_master
WHERE
    stud_id = '${params.id}' AND employee_master.emp_id = hostel_gate_pass.approved_by AND hostel_gate_pass.reject_status=1;`
    );
    res
      .status(200)
      .json(new ApiResponse(200, { rejectedGatePass: rejectedGatePass[0] }));
  } catch (err) {
    console.log(err);
    throw new ApiError(404, " Request Failed..!");
  }
});

const approvedGatePass = asyncHandler(async (req, res) => {
  const db = await connectDB();

  const params = req.params;
  if (!req.userIds.includes(params.id)) {
    throw new ApiError(401, "Unauthorized");
  }
  try {
    const approvedGatePass = await db.query(
      `SELECT
      id AS ID,
      out_time_approved AS OutTime,
      in_time_approved AS InTime,
      applyig_reason AS Reason,
      applied_on AS AppliedON,
      approved_on AS ApprovedON,
      employee_master.emp_name AS ApprovedBy
  FROM
      hostel_gate_pass,
      employee_master
  WHERE
      stud_id = '${params.id}' AND employee_master.emp_id = hostel_gate_pass.approved_by AND approved_by <> 0 AND reject_status=0;`
    );

    console.log(
      "approvedGatePass:=====>>",
      `SELECT
    id AS ID,
    out_time_approved AS OutTime,
    in_time_approved AS InTime,
    applyig_reason AS Reason,
    applied_on AS AppliedON,
    approved_on AS ApprovedON,
    employee_master.emp_name AS ApprovedBy
FROM
    hostel_gate_pass,
    employee_master
WHERE
    stud_id = '${params.id}' AND employee_master.emp_id = hostel_gate_pass.approved_by AND approved_by <> 0 AND reject_status=0;`
    );
    res
      .status(200)
      .json(new ApiResponse(200, { approvedGatePass: approvedGatePass[0] }));
  } catch (err) {
    console.log(err);
    throw new ApiError(404, " Request Failed..!");
  }
});

const getFilesInDirectory = async (dirPath) => {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  let files = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      const nestedFiles = await getFilesInDirectory(fullPath);
      files.push({ directory: entry.name, files: nestedFiles });
    } else {
      files.push(entry.name);
    }
  }

  return files;
};

const get_Notes = asyncHandler(async (req, res) => {
  const params = req.params;
  if (!req.userIds.includes(params.id)) {
    throw new ApiError(401, "Unauthorized");
  }
  try {
    const folderPath = "C:/Users/rungta/Desktop/RSR";
    const files = await getFilesInDirectory(folderPath);

    console.log("backend files:------>>", files);
    res.status(200).json(new ApiResponse(200, { files: files }));

  } catch (err) {
    console.log(err);
    throw new ApiError(404, "Request Failed..!");
  }
});


module.exports = {
  getAllData,
  getAttendanceToday,
  getAcademicTenure,
  getSemesterHolidayDates,
  getHolidayMonthWise,
  getAcademicPresentDates,
  holidayMonthWise,
  subjectInformation,
  subjectUnitInformation,
  getNotes,
  getNotesFiles,
  getAssignmentQquestionsByFaculty,
  getShowMCQQuestionAanswer,
  getBookList,
  checkBookIssueByStudent,
  checkBookRequestByStudent,
  bookRequest,
  bookRequestStatus,
  appliedGatePass,
  getAcademicPresentTillDates,
  updateData,
  updateFileData,
  getTesting,
  applyHostelGatePass,
  rejectedGatePass,
  approvedGatePass,
  get_Notes,
};
