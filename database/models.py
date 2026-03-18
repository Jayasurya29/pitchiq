import os
from dotenv import load_dotenv
from sqlalchemy import Column, Integer, String, Boolean, Text, ARRAY, TIMESTAMP
from sqlalchemy.orm import declarative_base
from sqlalchemy.sql import func

load_dotenv(os.path.join(os.path.dirname(__file__), '../.env'))

Base = declarative_base()

class ResearchHistory(Base):
    __tablename__ = "research_history"

    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String(255), nullable=False)
    company_website = Column(String(500))
    company_summary = Column(Text)
    pain_points = Column(ARRAY(Text))
    signals = Column(ARRAY(Text))
    fit_score = Column(Integer)
    value_props = Column(ARRAY(Text))
    email_subject = Column(String(500))
    email_body = Column(Text)
    quality_approved = Column(Boolean)
    send_time = Column(String(255))
    follow_up_sequence = Column(ARRAY(Text))
    created_at = Column(TIMESTAMP, server_default=func.now())