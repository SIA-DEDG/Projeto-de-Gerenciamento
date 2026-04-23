module ApplicationHelper
  def initials_for(name)
    return "NA" if name.blank?
    name.to_s.gsub(/\+.*$/, "").split(" ").map(&:first).join.upcase[0..1]
  end

  def avatar_color_for(name)
    colors = ["#ff991f", "#36b37e", "#ff5630", "#00b8d9", "#6554c0", "#0052cc", "#f5365c"]
    index = name.to_s.sum % colors.size
    colors[index]
  end
end
