
export const UniGuildData = {
  students: [
    {
      id: "STU001",
      name: "Arjun Sharma",
      email: "arjun@iitb.ac.in",
      college: "IIT Bombay",
      branch: "Computer Science",
      year: "3rd Year",
      rollNo: "21B030045",
      campusScore: 78,
      skills: ["React", "Node.js", "Python", "UI/UX", "Public Speaking"],
      interests: ["Hackathons", "Webinars", "Workshops"],
      profileViews: 234,
      eventsRegistered: 8,
      eventsAttended: 6,
      certificates: 4,
      reputationBreakdown: {
        events: 30,
        certificates: 25,
        skills: 20,
        completeness: 15,
        feedback: 10
      }
    }
  ],
  events: [
    {
      id: "EVT001",
      name: "Code Rush Hackathon 2025",
      category: "Hackathon",
      host: "IIT Bombay",
      date: "20-03-2026",
      time: "09:00 AM",
      venue: "Main Auditorium",
      status: "Open",
      slots: { filled: 423, total: 500 },
      description: "A 48-hour hackathon to build innovative solutions for real-world problems.",
      tags: ["Coding", "Innovation", "Prizes"],
      prizes: ["₹ 1,00,000", "₹ 50,000", "₹ 25,000"],
      stages: [
        { name: "Idea Submission", deadline: "15-03-2026", status: "Completed" },
        { name: "Prototype Demo", deadline: "18-03-2026", status: "Ongoing" },
        { name: "Final Pitch", deadline: "20-03-2026", status: "Upcoming" }
      ],
      coordinator: "Dr. Ramesh Kumar",
      coordinatorEmail: "ramesh.kumar@iitb.ac.in"
    },
    {
      id: "EVT002",
      name: "AI & Ethics Webinar",
      category: "Webinar",
      host: "BITS Pilani",
      date: "25-03-2026",
      time: "04:00 PM",
      venue: "Online",
      status: "Open",
      slots: { filled: 150, total: 200 },
      description: "Exploring the ethical implications of artificial intelligence in modern society.",
      tags: ["AI", "Ethics", "Tech"],
      prizes: ["Certificates"],
      stages: [{ name: "Live Session", deadline: "25-03-2026", status: "Upcoming" }],
      coordinator: "Prof. Sunita Rao",
      coordinatorEmail: "sunita.rao@bits-pilani.ac.in"
    },
    {
      id: "EVT003",
      name: "Design Thinking Workshop",
      category: "Workshop",
      host: "IIT Delhi",
      date: "10-04-2026",
      time: "10:00 AM",
      venue: "Design Studio",
      status: "Upcoming",
      slots: { filled: 45, total: 50 },
      description: "Learn the fundamentals of design thinking and user-centric problem solving.",
      tags: ["Design", "UX", "Creativity"],
      prizes: ["Certificates", "Swag"],
      stages: [{ name: "Workshop", deadline: "10-04-2026", status: "Upcoming" }],
      coordinator: "Dr. Amit Shah",
      coordinatorEmail: "amit.shah@iitd.ac.in"
    },
    {
      id: "EVT004",
      name: "National Debate Championship",
      category: "Competition",
      host: "NIT Warangal",
      date: "15-04-2026",
      time: "11:00 AM",
      venue: "Conference Hall",
      status: "Open",
      slots: { filled: 80, total: 100 },
      description: "A national level debate competition on contemporary socio-economic issues.",
      tags: ["Debate", "Public Speaking", "Logic"],
      prizes: ["₹ 50,000", "₹ 30,000", "₹ 20,000"],
      stages: [
        { name: "Preliminary Round", deadline: "12-04-2026", status: "Upcoming" },
        { name: "Finals", deadline: "15-04-2026", status: "Upcoming" }
      ],
      coordinator: "Prof. Vikram Singh",
      coordinatorEmail: "vikram.singh@nitw.ac.in"
    }
  ],
  jobs: [
    {
      id: "JOB001",
      company: "Google",
      logo: "https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_92x30dp.png",
      title: "Software Engineering Intern",
      type: "Internship",
      domain: "Search / Cloud",
      stipend: "₹ 1,00,000 / month",
      location: "Hyderabad",
      applyBy: "25-03-2026",
      skills: ["Java", "C++", "DSA"],
      status: "Under Review",
      targetBranch: "All"
    },
    {
      id: "JOB002",
      company: "Microsoft",
      logo: "https://img-prod-cms-rt-microsoft-com.akamaized.net/cms/api/am/imageMedia/RE1Mu3b?ver=5a31",
      title: "Cloud Solutions Architect",
      type: "Full-time",
      domain: "Azure",
      stipend: "₹ 25-35 LPA",
      location: "Bangalore",
      applyBy: "10-04-2026",
      skills: ["Azure", "Kubernetes", "Docker"],
      status: "Applied",
      targetBranch: "CSE"
    },
    {
      id: "JOB003",
      company: "Amazon",
      logo: "https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg",
      title: "SDE-1",
      type: "Full-time",
      domain: "E-commerce",
      stipend: "₹ 28-32 LPA",
      location: "Bangalore",
      applyBy: "15-04-2026",
      skills: ["Java", "AWS", "Microservices"],
      status: "Shortlisted",
      targetBranch: "CSE"
    },
    {
      id: "JOB004",
      company: "Meta",
      logo: "https://upload.wikimedia.org/wikipedia/commons/7/7b/Meta_Platforms_Inc._logo.svg",
      title: "Product Designer",
      type: "Full-time",
      domain: "Social Media",
      stipend: "₹ 30-40 LPA",
      location: "Remote",
      applyBy: "20-04-2026",
      skills: ["Figma", "UI/UX", "Prototyping"],
      status: "New",
      targetBranch: "All"
    }
  ],
  announcements: [
    {
      id: "ANN001",
      title: "Code Rush Hackathon starts in 2 days!",
      message: "Get your teams ready and check the final schedule.",
      time: "2 hours ago",
      priority: "Urgent",
      type: "event"
    },
    {
      id: "ANN002",
      title: "New Job Match: React Developer @ Razorpay",
      message: "A new job matching your skills has been posted.",
      time: "5 hours ago",
      priority: "Normal",
      type: "job"
    },
    {
      id: "ANN003",
      title: "Attendance Confirmed: Design Workshop",
      message: "Your attendance for the Design Workshop has been verified.",
      time: "1 day ago",
      priority: "Normal",
      type: "system"
    }
  ],
  colleges: [
    "IIT Bombay", "IIT Delhi", "BITS Pilani", "NIT Warangal", "IIT Madras", "IIT Kanpur", "IIT Roorkee", "IIT Guwahati", "NIT Trichy", "NIT Surathkal"
  ],
  volunteers: [
    { id: "VOL001", name: "Karthik", email: "karthik@sasi.ac.in", department: "CSE", role: "Logistics", zone: "Gate A", scans: 84, shift: "3h 12m", status: "On Duty" },
    { id: "VOL002", name: "Ananya", email: "ananya@sasi.ac.in", department: "ECE", role: "Registration", zone: "Main Hall", scans: 120, shift: "4h 05m", status: "On Duty" },
    { id: "VOL003", name: "Suresh", email: "suresh@sasi.ac.in", department: "ME", role: "Hospitality", zone: "Cafeteria", scans: 45, shift: "2h 30m", status: "Break" }
  ]
};
