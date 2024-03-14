const express = require("express");
const router = express.Router();
const studentDetails = require("../../services/student");
const auth = require("../../services/auth");
const authenticationMiddleware = require("../../middlewares/authenticationMiddleware");
const { createProxyMiddleware } = require("http-proxy-middleware");

//authentication
router.post("/login", auth.login);
router.get("/get_user_group", authenticationMiddleware, auth.getUserGroup);

// Student  Details Routes
router.get("/:id", authenticationMiddleware, studentDetails.getAllData);
router.put(
  "/:id/update_data",
  authenticationMiddleware,
  studentDetails.updateData
);
router.put(
  "/:id/update_file_data",
  authenticationMiddleware,
  studentDetails.updateFileData
);

// Student Attendance Details Routes
router.get(
  "/:id/attendance/today",
  authenticationMiddleware,
  studentDetails.getAttendanceToday
);
router.get(
  "/:id/academic_tenure",
  authenticationMiddleware,
  studentDetails.getAcademicTenure
);
router.get(
  "/:id/academic_holidays",
  authenticationMiddleware,
  studentDetails.getSemesterHolidayDates
);
router.get(
  "/:id/attendance/semester/holidays_monthwise",
  authenticationMiddleware,
  studentDetails.getHolidayMonthWise
);
router.get(
  "/:id/attendance/semester/attendance_dates",
  authenticationMiddleware,
  studentDetails.getAcademicPresentDates
);

router.get(
  "/:id/attendance/semester/attendance_till_dates",
  authenticationMiddleware,
  studentDetails.getAcademicPresentTillDates
);
// Student Acedemic Details Routes
router.get(
  "/:id/academic/academic_subject_information",
  authenticationMiddleware,
  studentDetails.subjectInformation
);

router.get(
  "/:id/academic/subject_unit_information",
  authenticationMiddleware,
  studentDetails.subjectUnitInformation
);

router.get(
  "/:id/academic/get_notes",
  authenticationMiddleware,
  studentDetails.getNotes
);

router.get(
  "/:id/academic/get_notes_files",
  authenticationMiddleware,
  studentDetails.getNotesFiles
);

router.get(
  "/:id/academic/assignment_questions_by_faculty",
  authenticationMiddleware,
  studentDetails.getAssignmentQquestionsByFaculty
);

// Student Library  Routes

router.get(
  "/:id/library/get_book_list",
  authenticationMiddleware,
  studentDetails.getBookList
);

router.get(
  "/:id/library/book_list",
  authenticationMiddleware,
  studentDetails.getTesting
);

router.get(
  "/:id/library/check_book_issue_by_student",
  authenticationMiddleware,
  studentDetails.checkBookIssueByStudent
);

router.get(
  "/:id/library/check_book_request_by_student",
  authenticationMiddleware,
  studentDetails.checkBookRequestByStudent
);

router.post(
  "/:id/library/book_request",
  authenticationMiddleware,
  studentDetails.bookRequest
);

router.get(
  "/:id/library/book_request_status",
  authenticationMiddleware,
  studentDetails.bookRequestStatus
);

// Student Gate Pass

router.get(
  "/:id/hostel/applied_gate_pass",
  authenticationMiddleware,
  studentDetails.appliedGatePass
);

router.get(
  "/:id/hostel/rejected_gate_pass",
  authenticationMiddleware,
  studentDetails.rejectedGatePass
);

router.get(
  "/:id/hostel/approved_gate_pass",
  authenticationMiddleware,
  studentDetails.approvedGatePass
);

router.post(
  "/:id/hostel/apply_hostel_gate_pass",
  authenticationMiddleware,
  studentDetails.applyHostelGatePass
);

// Notes

router.get(
  "/:id/notes/get_notes",
  authenticationMiddleware,
  studentDetails.get_Notes
);

module.exports = router;
