package com.civic.platform.config;

import com.civic.platform.domain.entities.User;
import com.civic.platform.domain.enums.Role;
import com.civic.platform.domain.repositories.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.civic.platform.domain.repositories.ComplaintRepository;
import com.civic.platform.domain.entities.Complaint;
import com.civic.platform.domain.enums.Category;
import com.civic.platform.domain.enums.ComplaintStatus;
import com.civic.platform.domain.enums.PriorityBand;
import java.math.BigDecimal;
import java.time.ZonedDateTime;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Coordinate;

@Configuration
@Profile("!prod")
public class DataSeeder {

    @Bean
    CommandLineRunner initDatabase(UserRepository userRepository, ComplaintRepository complaintRepository, PasswordEncoder passwordEncoder) {
        return args -> {
            if (userRepository.findByEmail("citizen@example.com").isEmpty()) {
                User citizen = new User();
                citizen.setName("Citizen Test");
                citizen.setEmail("citizen@example.com");
                citizen.setPasswordHash(passwordEncoder.encode("password"));
                citizen.setRole(Role.CITIZEN);
                citizen.setAuthProvider(com.civic.platform.domain.enums.AuthProvider.LOCAL);
                userRepository.save(citizen);
            }
            if (userRepository.findByEmail("officer@example.com").isEmpty()) {
                User officer = new User();
                officer.setName("Officer Test");
                officer.setEmail("officer@example.com");
                officer.setPasswordHash(passwordEncoder.encode("password"));
                officer.setRole(Role.FIELD_OFFICER);
                officer.setAuthProvider(com.civic.platform.domain.enums.AuthProvider.LOCAL);
                userRepository.save(officer);
            }
            if (userRepository.findByEmail("depthead@example.com").isEmpty()) {
                User depthead = new User();
                depthead.setName("DeptHead Test (Roads)");
                depthead.setEmail("depthead@example.com");
                depthead.setPasswordHash(passwordEncoder.encode("password"));
                depthead.setRole(Role.DEPT_HEAD);
                depthead.setDepartment("TRANSPORT_AND_ROADS");
                depthead.setAuthProvider(com.civic.platform.domain.enums.AuthProvider.LOCAL);
                userRepository.save(depthead);
            }
            if (userRepository.findByEmail("depthead_sanitation@example.com").isEmpty()) {
                User deptheadSan = new User();
                deptheadSan.setName("DeptHead Test (Sanitation)");
                deptheadSan.setEmail("depthead_sanitation@example.com");
                deptheadSan.setPasswordHash(passwordEncoder.encode("password"));
                deptheadSan.setRole(Role.DEPT_HEAD);
                deptheadSan.setDepartment("SANITATION");
                deptheadSan.setAuthProvider(com.civic.platform.domain.enums.AuthProvider.LOCAL);
                userRepository.save(deptheadSan);
            }
            if (userRepository.findByEmail("officer_sanitation@example.com").isEmpty()) {
                User officerSan = new User();
                officerSan.setName("Officer Test (Sanitation)");
                officerSan.setEmail("officer_sanitation@example.com");
                officerSan.setPasswordHash(passwordEncoder.encode("password"));
                officerSan.setRole(Role.FIELD_OFFICER);
                officerSan.setDepartment("SANITATION");
                officerSan.setLocation("17.3850,78.4867"); // Hyderabad center
                officerSan.setAuthProvider(com.civic.platform.domain.enums.AuthProvider.LOCAL);
                userRepository.save(officerSan);
            }
            if (userRepository.findByEmail("commissioner@example.com").isEmpty()) {
                User commissioner = new User();
                commissioner.setName("Commissioner Test");
                commissioner.setEmail("commissioner@example.com");
                commissioner.setPasswordHash(passwordEncoder.encode("password"));
                commissioner.setRole(Role.COMMISSIONER);
                commissioner.setAuthProvider(com.civic.platform.domain.enums.AuthProvider.LOCAL);
                userRepository.save(commissioner);
            }
            if (userRepository.findByEmail("varun876678@gmail.com").isEmpty()) {
                User admin = new User();
                admin.setName("Varun (Super Admin)");
                admin.setEmail("varun876678@gmail.com");
                admin.setPasswordHash(passwordEncoder.encode("Varun@9666"));
                admin.setRole(Role.SUPER_ADMIN);
                admin.setAuthProvider(com.civic.platform.domain.enums.AuthProvider.LOCAL);
                userRepository.save(admin);
            }
            userRepository.findByEmail("varunmandati7@gmail.com").ifPresentOrElse(u -> {
                u.setPasswordHash(passwordEncoder.encode("password"));
                u.setRole(Role.COMMISSIONER);
                userRepository.save(u);
            }, () -> {
                User comm2 = new User();
                comm2.setName("Commissioner Varun");
                comm2.setEmail("varunmandati7@gmail.com");
                comm2.setPasswordHash(passwordEncoder.encode("password"));
                comm2.setRole(Role.COMMISSIONER);
                comm2.setAuthProvider(com.civic.platform.domain.enums.AuthProvider.LOCAL);
                userRepository.save(comm2);
            });

            userRepository.findByEmail("237r1a05az@cmrtc.ac.in").ifPresentOrElse(u -> {
                u.setPasswordHash(passwordEncoder.encode("password"));
                u.setRole(Role.DEPT_HEAD);
                u.setDepartment("TRANSPORT_AND_ROADS");
                userRepository.save(u);
            }, () -> {
                User dept2 = new User();
                dept2.setName("DeptHead Varun");
                dept2.setEmail("237r1a05az@cmrtc.ac.in");
                dept2.setPasswordHash(passwordEncoder.encode("password"));
                dept2.setRole(Role.DEPT_HEAD);
                dept2.setDepartment("TRANSPORT_AND_ROADS");
                dept2.setAuthProvider(com.civic.platform.domain.enums.AuthProvider.LOCAL);
                userRepository.save(dept2);
            });

            userRepository.findByEmail("varun765567@gmail.com").ifPresentOrElse(u -> {
                u.setPasswordHash(passwordEncoder.encode("password"));
                u.setRole(Role.FIELD_OFFICER);
                u.setDepartment("TRANSPORT_AND_ROADS");
                u.setLocation("17.3850,78.4867");
                userRepository.save(u);
            }, () -> {
                User off2 = new User();
                off2.setName("Officer Varun");
                off2.setEmail("varun765567@gmail.com");
                off2.setPasswordHash(passwordEncoder.encode("password"));
                off2.setRole(Role.FIELD_OFFICER);
                off2.setDepartment("TRANSPORT_AND_ROADS");
                off2.setLocation("17.3850,78.4867");
                off2.setAuthProvider(com.civic.platform.domain.enums.AuthProvider.LOCAL);
                userRepository.save(off2);
            });

            // Seed Complaints for the Last 7 Days to populate the Trend Chart
            if (complaintRepository.count() == 0) {
                GeometryFactory gf = new GeometryFactory();
                User citizen = userRepository.findByEmail("citizen@example.com").orElse(null);
                User officerSan = userRepository.findByEmail("officer_sanitation@example.com").orElse(null);
                User officerRoads = userRepository.findByEmail("varun765567@gmail.com").orElse(null);
                
                if (citizen != null) {
                    for (int i = 0; i < 7; i++) {
                        Complaint c = new Complaint();
                        c.setCitizen(citizen);
                        c.setCategory(i % 2 == 0 ? Category.GARBAGE : Category.POTHOLE);
                        c.setDescription("Test complaint " + i);
                        c.setAddress("Test Location " + i);
                        c.setSeverity(i % 3 == 0 ? "HIGH" : "MEDIUM");
                        c.setPriorityBand(PriorityBand.MEDIUM);
                        c.setStatus(i == 0 ? ComplaintStatus.RESOLVED : ComplaintStatus.REPORTED);
                        c.setLatitude(new BigDecimal("17." + (3850 + i)));
                        c.setLongitude(new BigDecimal("78." + (4867 + i)));
                        c.setGeom(gf.createPoint(new Coordinate(c.getLongitude().doubleValue(), c.getLatitude().doubleValue())));
                        c.setPublicId("TEST-COM-" + i);
                        c.setAiConfidenceScore(new BigDecimal("0.95"));
                        
                        if (c.getCategory() == Category.GARBAGE && officerSan != null) {
                            c.setAssignedOfficerId(officerSan.getId());
                        } else if (c.getCategory() == Category.POTHOLE && officerRoads != null) {
                            c.setAssignedOfficerId(officerRoads.getId());
                        }
                        
                        // Spread dates across the last 7 days
                        c.setCreatedAt(ZonedDateTime.now().minusDays(i));
                        if (i == 0) {
                           c.setResolvedAt(ZonedDateTime.now());
                        }
                        complaintRepository.save(c);

                        // Since createdAt is updatable=false in the entity, we must use a native query or just rely on it being populated.
                        // Actually, createdAt has insertable=false, updatable=false in Complaint.java.
                        // We need to bypass this or let JPA set it to now(), but wait, if it's set by Postgres DEFAULT NOW(), it will be now!
                    }
                }
            }
        };
    }
}
